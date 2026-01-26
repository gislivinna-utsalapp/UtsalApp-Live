// server/storage.ts
import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import sharp from "sharp";
import rateLimit from "express-rate-limit";
import cors from "cors";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import { storage } from "./storage-db"; // DB STORAGE

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// --------------------------------------------------
// TYPES
// --------------------------------------------------

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    storeId?: string;
  };
}

// --------------------------------------------------
// TRIAL / BILLING HJÁLPARFÖLL
// --------------------------------------------------

function getTrialStatus(store: any) {
  const trialEndsAtRaw = store?.trialEndsAt;

  if (!trialEndsAtRaw) {
    return {
      trialEndsAt: null as Date | null,
      daysLeft: null as number | null,
      isExpired: false,
    };
  }

  const trialEndsAt = new Date(trialEndsAtRaw);
  const now = new Date();
  const diffMs = trialEndsAt.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    trialEndsAt,
    daysLeft,
    isExpired: diffMs <= 0,
  };
}

async function getStoreForUser(user: AuthRequest["user"]) {
  if (!user?.storeId) return null;
  const store = await storage.getStoreById(user.storeId);
  return store ?? null;
}

// --------------------------------------------------
// AUTH MIDDLEWARE
// --------------------------------------------------

function auth(requiredRole?: "store" | "admin") {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthRequest["user"];

      if (!decoded) return res.status(401).json({ message: "Invalid token" });

      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: "Forbidden" });
      }

      req.user = {
        ...decoded,
        isAdmin: decoded.isAdmin === true,
      };
      next();
    } catch (err) {
      return res.status(401).json({ message: "Token invalid or expired" });
    }
  };
}

// --------------------------------------------------
// RATE LIMIT
// --------------------------------------------------

const authLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: 10,
});

// --------------------------------------------------
// MAIN EXPORT
// --------------------------------------------------

export function registerRoutes(app: Express): Server {
  app.use(cors());
  app.use(express.json());

  app.use("/uploads", express.static(UPLOAD_DIR));

  // -----------------------------------------
  // REGISTER USER / STORE
  // -----------------------------------------

  app.post(
    "/api/v1/register",
    authLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email, password, role, storeName, address } = req.body;

        if (!email || !password || !role) {
          return res.status(400).json({ message: "Missing required fields" });
        }

        const existing = await storage.findUserByEmail(email);
        if (existing)
          return res.status(400).json({ message: "User already exists" });

        const hash = await bcrypt.hash(password, 10);

        let storeId: string | undefined = undefined;

        if (role === "store") {
          const storeObj: any = {
            name: storeName || "Ónefnd verslun",
            address: address || "",
            logoUrl: "",
            ownerEmail: email,
            planType: "basic",
            trialEndsAt: null,
            billingActive: false,
            billingStatus: "trial",
          };
          const createdStore = await storage.createStore(storeObj);
          storeId = createdStore.id;
        }

        const newUserObj: any = {
          email,
          passwordHash: hash,
          role,
          storeId,
        };

        const createdUser = await storage.createUser(newUserObj);

        return res.json({
          id: createdUser.id,
          email: createdUser.email,
          role: createdUser.role,
          storeId,
        });
      } catch (err) {
        console.error("Registration failed:", err);
        return res.status(500).json({ message: "Registration failed" });
      }
    },
  );

  // -----------------------------------------
  // LOGIN
  // -----------------------------------------

  app.post(
    "/api/v1/login",
    authLimiter,
    async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;

        const user = await storage.findUserByEmail(email);
        if (!user) return res.status(400).json({ message: "User not found" });

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return res.status(400).json({ message: "Wrong password" });

        const token = jwt.sign(
          {
            id: user.id,
            email: user.email,
            role: user.role,
            storeId: (user as any).storeId,
          },
          JWT_SECRET,
          { expiresIn: "7d" },
        );

        return res.json({
          token,
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            storeId: (user as any).storeId,
          },
        });
      } catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login error" });
      }
    },
  );

  // -----------------------------------------
  // ME
  // -----------------------------------------

  router.get("/me", auth(), async (req: AuthRequest, res: Response) => {
    return res.json(req.user);
  });

  // -----------------------------------------
  // STORE ME (trial / billing info fyrir verslun)
  // -----------------------------------------

  app.get(
    "/api/v1/store/me",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        const store = await getStoreForUser(req.user);
        if (!store) {
          return res
            .status(404)
            .json({ message: "Engin verslun tengd þessum aðgangi" });
        }

        const trial = getTrialStatus(store);

        return res.json({
          ...store,
          trial,
        });
      } catch (err) {
        console.error("GET /store/me error:", err);
        return res
          .status(500)
          .json({ message: "Gat ekki sótt upplýsingar um verslun" });
      }
    },
  );

  // -----------------------------------------
  // ACTIVATE PLAN (VELJA PAKKA + FRÍVIKU)
  // -----------------------------------------

  app.post(
    "/api/v1/stores/activate-plan",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res
            .status(403)
            .json({ message: "Engin verslun tengd þessum aðgangi." });
        }

        const planInput =
          (req.body?.planType as string | undefined) ||
          (req.body?.plan as string | undefined) ||
          "basic";

        let planType: "basic" | "pro" | "premium" = "basic";
        if (planInput === "pro" || planInput === "premium") {
          planType = planInput;
        }

        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res
            .status(404)
            .json({ message: "Verslun fannst ekki fyrir þennan aðgang." });
        }

        const previousTrial = getTrialStatus(store);
        let trialEndsAt: string;

        if (!store.trialEndsAt || previousTrial.isExpired) {
          const now = new Date();
          const ends = new Date(
            now.getTime() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString();
          trialEndsAt = ends;
        } else {
          trialEndsAt = store.trialEndsAt;
        }

        const updated = await storage.updateStore(store.id, {
          planType,
          plan: planType,
          trialEndsAt,
          billingActive: true,
          billingStatus: (store as any).billingStatus ?? "trial",
        });

        if (!updated) {
          return res
            .status(500)
            .json({ message: "Tókst ekki að uppfæra verslun." });
        }

        const trialStatus = getTrialStatus(updated);

        return res.json({
          id: updated.id,
          name: updated.name,
          planType: updated.planType,
          plan: (updated as any).plan ?? updated.planType,
          trialEndsAt: updated.trialEndsAt,
          billingActive: updated.billingActive,
          billingStatus: (updated as any).billingStatus ?? "trial",
          trial: {
            trialEndsAt: trialStatus.trialEndsAt,
            daysLeft: trialStatus.daysLeft,
            isExpired: trialStatus.isExpired,
          },
        });
      } catch (err) {
        console.error("activate-plan error:", err);
        return res
          .status(500)
          .json({ message: "Villa kom upp við að virkja pakka." });
      }
    },
  );

  // -----------------------------------------
  // CREATE SALE POST (STORE ONLY)
  // -----------------------------------------

  app.post(
    "/api/v1/posts",
    auth("store"),
    upload.single("image"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res.status(403).json({ message: "Store account required" });
        }

        // TRIAL / BILLING CHECK
        const store = await getStoreForUser(req.user);
        if (!store) {
          return res
            .status(403)
            .json({ message: "Verslun fannst ekki fyrir þennan notanda" });
        }

        const trial = getTrialStatus(store);

        if (trial.isExpired && (store as any).billingStatus !== "active") {
          return res.status(403).json({
            message:
              "Fríprufutími verslunar í ÚtsalApp er lokið. Hafðu samband til að virkja áskrift.",
            code: "TRIAL_EXPIRED",
          });
        }

        const { title, description, price, oldPrice, category } = req.body;

        let imageUrl = "";

        if (req.file) {
          const fileName = `${crypto.randomUUID()}.jpg`;
          const filePath = path.join(UPLOAD_DIR, fileName);

          await sharp(req.file.buffer).jpeg({ quality: 80 }).toFile(filePath);

          imageUrl = `/uploads/${fileName}`;
        }

        const postObj: any = {
          title,
          description,
          price: Number(price),
          oldPrice: Number(oldPrice),
          category,
          imageUrl,
          storeId: req.user.storeId,
          createdAt: new Date().toISOString(),
        };

        const created = await storage.createPost(postObj);

        return res.json(created);
      } catch (err) {
        console.error("Could not create post:", err);
        return res.status(500).json({ message: "Could not create post" });
      }
    },
  );

  // -----------------------------------------
  // LIST POSTS
  // -----------------------------------------

  router.get("/posts", async (req: Request, res: Response) => {
    const q = (req.query.q as string)?.toLowerCase() || "";
    const posts = await storage.listPosts();

    const filtered = q
      ? (posts as any[]).filter((p) =>
          (p.title || "").toLowerCase().includes(q),
        )
      : posts;

    return res.json(filtered);
  });

  // -----------------------------------------
  // LIST STORES
  // -----------------------------------------

  router.get("/stores", async (req: Request, res: Response) => {
    const stores = await storage.listStores();
    return res.json(stores);
  });

  // -----------------------------------------
  // LIST POSTS FOR ONE STORE
  // -----------------------------------------

  app.get("/api/v1/stores/:id/posts", async (req: Request, res: Response) => {
    const id = req.params.id;
    const posts = await storage.getPostsByStore(id);
    return res.json(posts);
  });

  // -----------------------------------------
  // DELETE POST (STORE ONLY, OWN POSTS ONLY)
  // -----------------------------------------

  app.delete(
    "/api/v1/posts/:id",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        const postId = req.params.id;
        const allPosts = await storage.listPosts();
        const target = (allPosts as any[]).find((p) => p.id === postId);

        if (!target) {
          return res.status(404).json({ message: "Post not found" });
        }

        if (target.storeId !== req.user?.storeId) {
          return res.status(403).json({ message: "Not your post" });
        }

        const success = await storage.deletePost(postId);

        return res.json({ deleted: success });
      } catch (err) {
        console.error("Delete error:", err);
        return res.status(500).json({ message: "Delete error" });
      }
    },
  );

  // -----------------------------------------
  // RUN SERVER
  // -----------------------------------------

  const httpServer = createServer(app);
  return httpServer;
}
