// server/registerstore.ts (eða route skránni þinni sem notar registerRoutes)
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import crypto from "crypto";

import { storage } from "./storage-db";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "store" | "admin";
        storeId?: string;
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function auth(requiredRole?: "store" | "admin") {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Ekki innskráður" });
    }
    try {
      const decoded = jwt.verify(header.substring(7), JWT_SECRET) as any;
      if (!decoded?.id || !decoded?.email || !decoded?.role) {
        return res.status(401).json({ message: "Ógildur token" });
      }
      req.user = decoded;
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: "Ekki heimild" });
      }
      next();
    } catch {
      return res.status(401).json({ message: "Ógildur token" });
    }
  };
}

export function registerRoutes(app: express.Express) {
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(UPLOAD_DIR));

  // ----------------------------------
  // AUTH / REGISTER
  // ----------------------------------

  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const rawEmail = req.body?.email ?? "";
      const rawPassword = req.body?.password ?? "";
      const email = rawEmail.trim().toLowerCase();
      const password = rawPassword.trim();

      if (!email || !password) {
        return res.status(400).json({ message: "Vantar netfang og lykilorð" });
      }

      const user = await storage.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Rangt netfang eða lykilorð" });
      }

      const ok = await bcrypt.compare(password, (user as any).passwordHash);
      if (!ok) {
        return res.status(401).json({ message: "Rangt netfang eða lykilorð" });
      }

      const token = jwt.sign(
        {
          id: (user as any).id,
          email,
          role: (user as any).role,
          storeId: (user as any).storeId,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.json({
        user: { id: (user as any).id, email, role: (user as any).role },
        token,
      });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.post("/api/v1/auth/register-store", async (req, res) => {
    try {
      const {
        storeName,
        email: rawEmail,
        password: rawPassword,
        address,
        phone,
        website,
      } = req.body;
      const email = (rawEmail ?? "").trim().toLowerCase();
      const password = (rawPassword ?? "").trim();

      if (!storeName || !email || !password) {
        return res.status(400).json({ message: "Vantar upplýsingar" });
      }
      if (await storage.findUserByEmail(email)) {
        return res.status(400).json({ message: "Netfang er þegar í notkun" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const store = await storage.createStore({
        name: storeName,
        address,
        phone,
        website,
        plan: "basic",
        billingStatus: "trial",
      } as any);
      const user = await storage.createUser({
        email,
        passwordHash,
        role: "store",
        storeId: (store as any).id,
      } as any);

      return res.json({
        user: { id: (user as any).id, email, role: (user as any).role },
        store,
      });
    } catch (err) {
      console.error("register-store error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.get("/api/v1/auth/me", auth(), async (req, res) => {
    try {
      if (!req.user)
        return res.status(401).json({ message: "Ekki innskráður" });
      const user = req.user;
      return res.json({
        user: { id: user.id, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error("auth/me error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ----------------------------------
  // ACTIVATE PLAN
  // ----------------------------------

  app.post("/api/v1/stores/activate-plan", auth("store"), async (req, res) => {
    try {
      const { plan } = req.body;
      const validPlans = ["basic", "pro", "premium"];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Ógilt plan valið" });
      }

      if (!req.user?.storeId) {
        return res
          .status(400)
          .json({ message: "Engin verslun tengd innskráningu" });
      }

      const updated = await storage.updateStore(req.user.storeId, {
        plan,
        billingStatus: "active",
      } as any);
      if (!updated) {
        return res.status(404).json({ message: "Verslun fannst ekki" });
      }

      return res.json({ message: "Áskrift virkjuð", store: updated });
    } catch (err) {
      console.error("activate-plan error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ----------------------------------
  // POSTS
  // ----------------------------------

  app.get("/api/v1/posts", async (req, res) => {
    try {
      const posts = await storage.listPosts();
      return res.json(posts);
    } catch (err) {
      console.error("list posts error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.get("/api/v1/posts/:id", async (req, res) => {
    try {
      const post = await storage.getPostById(req.params.id);
      if (!post) return res.status(404).json({ message: "Tilboð fannst ekki" });
      return res.json(post);
    } catch (err) {
      console.error("post detail error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.post("/api/v1/posts", auth("store"), async (req, res) => {
    try {
      const { title, category, price, oldPrice } = req.body;
      if (!title || !category || price == null)
        return res.status(400).json({ message: "Vantar upplýsingar" });
      if (!req.user?.storeId)
        return res.status(400).json({ message: "Engin verslun tengd" });
      const newPost = await storage.createPost({
        title,
        category,
        price,
        oldPrice,
        storeId: req.user.storeId,
      } as any);
      return res.json(newPost);
    } catch (err) {
      console.error("create post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ----------------------------------
  // ADMIN ROUTES
  // ----------------------------------

  app.delete("/api/v1/admin/posts/:id", auth("admin"), async (req, res) => {
    try {
      await storage.deletePost(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      console.error("admin delete post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.delete("/api/v1/admin/stores/:id", auth("admin"), async (req, res) => {
    try {
      await storage.deleteStore(req.params.id);
      return res.json({ success: true });
    } catch (err) {
      console.error("admin delete store error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ----------------------------------
  // UPLOADS
  // ----------------------------------

  app.post(
    "/api/v1/uploads",
    auth("store"),
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ message: "Engin mynd" });
        const filename = `${crypto.randomUUID()}.jpg`;
        const filepath = path.join(UPLOAD_DIR, filename);
        await sharp(req.file.buffer)
          .resize(1200, 1200)
          .jpeg({ quality: 80 })
          .toFile(filepath);
        return res.json({ url: `/uploads/${filename}` });
      } catch (err) {
        console.error("upload error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ----------------------------------
  // Serve client in production
  // ----------------------------------

  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(process.cwd(), "client", "dist");
    app.use(express.static(clientDistPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/"))
        return res.sendStatus(404);
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }
}
