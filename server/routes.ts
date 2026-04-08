// server/routes.ts
import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";

import { storage } from "./storage-db";
import { UPLOAD_DIR, toAbsoluteImageUrl } from "./config/uploads";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

// 🔑 Multer – disk storage (FINAL, RECOMMENDED)
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${crypto.randomUUID()}${ext.toLowerCase()}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "user" | "store" | "admin";
    storeId?: string;
  };
}

// Cache til að koma í veg fyrir tvöfalda talningu á sama IP + tilboð á stuttum tíma
const lastViewCache: Record<string, number> = {};
const VIEW_DEDUP_WINDOW_MS = 5_000; // 5 sekúndur

const TRIAL_DAYS = 7;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

// ------------------------- AUTH MIDDLEWARE -------------------------

function auth(requiredRole?: "store" | "admin") {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Ekki innskráður" });
    }

    try {
      const decoded = jwt.verify(
        header.substring(7),
        JWT_SECRET,
      ) as AuthRequest["user"];
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

function authAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Ekki innskráður" });
  }
  try {
    const decoded = jwt.verify(header.substring(7), JWT_SECRET) as any;
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "Aðeins admin hefur heimild" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Ógildur token" });
  }
}

function isTrialExpired(store: any): boolean {
  if (!store) return true;
  if (store.billingStatus === "active") return false;
  if (!store.trialEndsAt) return false;

  const ts = new Date(store.trialEndsAt).getTime();
  if (!Number.isFinite(ts)) return false;

  return Date.now() > ts;
}

// Middleware: verslun þarf að hafa valið pakka (basic/pro/premium) til að búa til tilboð
async function requirePlanSelected(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.storeId) {
      return res.status(401).json({ message: "Óheimilt" });
    }

    const store = await storage.getStoreById(req.user.storeId);
    if (!store) {
      return res.status(404).json({ message: "Verslun fannst ekki" });
    }

    const plan = (store as any).plan;
    const allowed = ["basic", "pro", "premium"];

    if (!plan || !allowed.includes(plan)) {
      return res.status(403).json({
        message: "Þú þarft að velja pakka áður en þú getur búið til tilboð.",
        code: "PLAN_REQUIRED",
      });
    }

    return next();
  } catch (err) {
    console.error("requirePlanSelected error", err);
    return res.status(500).json({ message: "Villa kom upp" });
  }
}

// ------------------------- MAPPA POST Í FRONTEND FORMAT -------------------------

async function mapPostToFrontend(p: any, req?: Request) {
  const store = p.storeId ? await storage.getStoreById(p.storeId) : null;

  const plan = (store as any)?.plan ?? (store as any)?.planType ?? "basic";
  const billingStatus =
    (store as any)?.billingStatus ??
    ((store as any)?.billingActive ? "active" : "trial");

  const resolvedImageUrl = req
    ? toAbsoluteImageUrl(p.imageUrl, req)
    : p.imageUrl ?? null;

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,

    priceOriginal: Number(p.oldPrice ?? p.priceOriginal ?? 0),
    priceSale: Number(p.price ?? p.priceSale ?? 0),

    images: resolvedImageUrl
      ? [
          {
            url: resolvedImageUrl,
            alt: p.title,
          },
        ]
      : [],

    startsAt: p.startsAt ?? null,
    endsAt: p.endsAt ?? null,

    buyUrl: p.buyUrl ?? null,
    viewCount: p.viewCount ?? 0,

    store: store
      ? {
          id: store.id,
          name: store.name,
          plan,
          planType: plan,
          billingStatus,
          createdAt: (store as any).createdAt ?? null,
        }
      : null,
  };
}

// ------------------------- HJÁLPARFALL FYRIR RÖÐUN -------------------------

function getPlanRankForPost(
  post: any,
  storesById: Record<string, any>,
): number {
  const store = post.storeId ? storesById[post.storeId] : null;
  const plan = store?.plan ?? store?.planType;

  if (plan === "premium") return 3;
  if (plan === "pro") return 2;
  return 1; // basic eða ekkert skilgreint
}

// ------------------------- ROUTES START -------------------------

export async function registerRoutes(app: Express): Promise<void> {
  const router = express.Router();

  // Grunn middleware
  router.use(cors());
  router.use(express.json());

  // ------------------ AUTH: REGISTER STORE (AUTO-LOGIN) ------------------
  router.post("/auth/register-store", async (req: Request, res: Response) => {
    try {
      const {
        storeName,
        email: rawEmail,
        password: rawPassword,
        address,
        phone,
        website,
      } = req.body as {
        storeName?: string;
        email?: string;
        password?: string;
        address?: string;
        phone?: string;
        website?: string;
      };

      if (!storeName || !rawEmail || !rawPassword) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const email = rawEmail.trim().toLowerCase();
      const password = rawPassword.trim();

      // 1️⃣ Búa til STORE (engin password hér!)
      const store = await storage.createStore({
        name: storeName.trim(),
        address: (address ?? "").trim(),
        phone: (phone ?? "").trim(),
        website: (website ?? "").trim(),
        logoUrl: "",
        ownerEmail: email, // 🔥 mikilvægt
        plan: "basic",
        billingStatus: "trial",
        accessEndsAt: null,
        trialEndsAt: null,
      } as any);

      // 2️⃣ Búa til USER
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createUser({
        email,
        passwordHash,
        role: "store",
        storeId: store.id,
      } as any);

      // 3️⃣ 🔑 AUTO-LOGIN (lykilatriðið)
      (req.session as any).user = {
        id: user.id,
        role: "store",
        storeId: store.id,
      };

      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => (err ? reject(err) : resolve()));
      });

      // 4️⃣ Response
      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        store: {
          id: store.id,
          name: store.name,
          plan: store.plan,
          billingStatus: store.billingStatus,
        },
      });
    } catch (err) {
      console.error("[auth/register-store] error:", err);
      return res.status(500).json({ error: "Failed to register store" });
    }
  });

  // ------------------ AUTH: LOGIN ------------------
  router.post("/auth/login", async (req: Request, res: Response) => {
    try {
      console.log("------ LOGIN DEBUG START ------");

      const rawEmail = (req.body?.email ?? "") as string;
      const rawPassword = (req.body?.password ?? "") as string;

      const email = rawEmail.trim().toLowerCase();
      const password = rawPassword.trim();

      if (!email || !password) {
        return res.status(400).json({ message: "Vantar netfang og lykilorð" });
      }

      // ------------------ USER LOOKUP ------------------
      console.log("Looking up user...");
      const user = await storage.findUserByEmail(email);
      console.log("User lookup done");

      if (!user) {
        return res.status(401).json({ message: "Rangt netfang eða lykilorð" });
      }

      // ------------------ PASSWORD CHECK ------------------
      let passwordOk = false;

      const storedHash = user.passwordHash || (user as any).password || null;

      if (storedHash && storedHash.startsWith("$2")) {
        console.log("Starting bcrypt compare...");
        const start = Date.now();

        passwordOk = await bcrypt.compare(password, storedHash);

        console.log("bcrypt compare took:", Date.now() - start, "ms");
      }

      // Legacy fallback (plain password upgrade)
      if (!passwordOk && (user as any).password === password) {
        console.log("Legacy password match – upgrading hash");

        passwordOk = true;

        const newHash = await bcrypt.hash(password, 8); // lækkað cost í 8
        await storage.updateUser(user.id, {
          passwordHash: newHash,
        } as any);
      }

      if (!passwordOk) {
        return res.status(401).json({ message: "Rangt netfang eða lykilorð" });
      }

      // ------------------ STORE ------------------
      let store = user.storeId
        ? await storage.getStoreById(user.storeId)
        : null;

      if (
        store &&
        !(store as any).trialEndsAt &&
        (store as any).billingStatus !== "expired"
      ) {
        const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();

        const updated = await storage.updateStore(store.id, {
          trialEndsAt,
          billingStatus: (store as any).billingStatus ?? "trial",
        } as any);

        if (updated) store = updated;
      }

      const isAdmin = (user as any).isAdmin === true;

      // ------------------ JWT ------------------
      const token = jwt.sign(
        {
          id: user.id,
          email,
          role: user.role,
          storeId: user.storeId,
          isAdmin,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      return res.json({
        user: {
          id: user.id,
          email,
          role: user.role,
          isAdmin,
        },
        store,
        token,
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      return res.status(500).json({ message: "Villa við innskráningu" });
    }
  });

  // ------------------ STORES: BILLING INFO FYRIR VERSLUN ------------------
  router.get(
    "/stores/me/billing",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res
            .status(400)
            .json({ message: "Engin tengd verslun fannst" });
        }

        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }

        const trialEndsAt = (store as any).trialEndsAt ?? null;
        const billingStatus =
          (store as any).billingStatus ??
          ((store as any).billingActive ? "active" : "trial");

        let daysLeft: number | null = null;
        if (trialEndsAt) {
          const endMs = new Date(trialEndsAt).getTime();
          if (Number.isFinite(endMs)) {
            const diff = endMs - Date.now();
            daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
          }
        }

        const plan = (store as any).plan ?? (store as any).planType ?? "basic";

        return res.json({
          plan,
          trialEndsAt,
          billingStatus,
          trialExpired: isTrialExpired(store),
          daysLeft,
          createdAt: (store as any).createdAt ?? null,
        });
      } catch (err) {
        console.error("stores/me/billing error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ STORES: ACTIVATE PLAN / FRÍVIKA ------------------
  router.post(
    "/stores/activate-plan",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        const bodyPlan = (req.body.plan ?? req.body.planType) as
          | string
          | undefined;
        const allowed = ["basic", "pro", "premium"];

        if (!bodyPlan || !allowed.includes(bodyPlan)) {
          return res.status(400).json({ message: "Ógild pakkategund" });
        }

        if (!req.user?.storeId) {
          return res
            .status(400)
            .json({ message: "Engin tengd verslun fannst" });
        }

        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }

        const now = Date.now();
        const existingTrialEnds = (store as any).trialEndsAt
          ? new Date((store as any).trialEndsAt).getTime()
          : null;

        let trialEndsAt: string | null = (store as any).trialEndsAt ?? null;

        // Ef verslun hefur EKKI fengið fríviku áður → gefum 7 daga frá núna
        if (!existingTrialEnds) {
          trialEndsAt = new Date(now + TRIAL_MS).toISOString();
        }

        const updated = await storage.updateStore(store.id, {
          plan: bodyPlan,
          trialEndsAt,
          billingStatus: (store as any).billingStatus ?? "trial",
        } as any);

        if (!updated) {
          return res
            .status(500)
            .json({ message: "Tókst ekki að uppfæra pakka" });
        }

        const plan =
          (updated as any).plan ?? (updated as any).planType ?? "basic";
        const billingStatus =
          (updated as any).billingStatus ??
          ((updated as any).billingActive ? "active" : "trial");

        const billingActive =
          billingStatus === "active" || billingStatus === "trial";

        return res.json({
          id: updated.id,
          name: updated.name,
          address: (updated as any).address ?? "",
          phone: (updated as any).phone ?? "",
          website: (updated as any).website ?? "",
          plan,
          planType: plan,
          trialEndsAt: (updated as any).trialEndsAt ?? null,
          billingStatus,
          billingActive,
          createdAt: (updated as any).createdAt ?? null, // BÆTT VIÐ
        });
      } catch (err) {
        console.error("activate-plan error:", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ STORES: EXTEND TRIAL BY 7 DAYS ------------------
  router.post(
    "/stores/me/extend-trial",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }

        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }

        const EXTEND_MS = 7 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        const currentTrialEnds = (store as any).trialEndsAt
          ? new Date((store as any).trialEndsAt).getTime()
          : 0;

        const baseTime = currentTrialEnds > now ? currentTrialEnds : now;
        const newTrialEndsAt = new Date(baseTime + EXTEND_MS).toISOString();

        const updated = await storage.updateStore(store.id, {
          trialEndsAt: newTrialEndsAt,
          billingStatus: "trial",
        } as any);

        if (!updated) {
          return res.status(500).json({ message: "Tókst ekki að framlengja aðgang" });
        }

        const plan = (updated as any).plan ?? (updated as any).planType ?? "basic";
        const billingStatus = (updated as any).billingStatus ?? "trial";
        const trialEndsAt = (updated as any).trialEndsAt ?? null;

        let daysLeft: number | null = null;
        if (trialEndsAt) {
          const endMs = new Date(trialEndsAt).getTime();
          if (Number.isFinite(endMs)) {
            daysLeft = Math.ceil((endMs - Date.now()) / (24 * 60 * 60 * 1000));
          }
        }

        return res.json({
          plan,
          trialEndsAt,
          billingStatus,
          trialExpired: false,
          daysLeft,
          createdAt: (updated as any).createdAt ?? null,
        });
      } catch (err) {
        console.error("extend-trial error:", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ STORES: CHANGE PASSWORD ------------------
  router.post(
    "/stores/change-password",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Ekki innskráður" });
        }

        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          return res
            .status(400)
            .json({ message: "Vantar núverandi og nýtt lykilorð" });
        }

        if (newPassword.length < 8) {
          return res
            .status(400)
            .json({ message: "Nýtt lykilorð þarf að vera a.m.k. 8 stafir" });
        }

        const user = await storage.findUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "Notandi fannst ekki" });
        }

        const valid = await bcrypt.compare(
          currentPassword,
          (user as any).passwordHash,
        );
        if (!valid) {
          return res
            .status(403)
            .json({ message: "Núverandi lykilorð er rangt" });
        }

        const newHash = await bcrypt.hash(newPassword, 10);
        await storage.updateUser(userId, { passwordHash: newHash });

        res.json({ success: true, message: "Lykilorð uppfært" });
      } catch (err) {
        console.error("change-password error:", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ STORES: LIST ALL ------------------
  router.get("/stores", async (_req, res) => {
    try {
      const stores = await storage.listStores();
      res.json(stores);
    } catch (err) {
      console.error("stores list error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ STORES: GET ONE (PUBLIC) ------------------
  router.get("/stores/:id", async (req, res) => {
    try {
      const store = await storage.getStoreById(req.params.id);

      if (!store) {
        return res.status(404).json({ message: "Verslun fannst ekki" });
      }

      res.json({
        id: store.id,
        name: store.name,
        address: (store as any).address ?? "",
        phone: (store as any).phone ?? "",
        website: (store as any).website ?? "",
        createdAt: (store as any).createdAt ?? null,
      });
    } catch (err) {
      console.error("get store error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ STORES: REGISTER (PUBLIC) ------------------
  router.post("/stores/register", async (req, res) => {
    try {
      const { storeName, email, password, address, phone, website } = req.body;

      if (!storeName || !email || !password) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const normalizedEmail = email.trim().toLowerCase();

      const store = await storage.createStore({
        storeName: storeName.trim(),
        email: normalizedEmail,
        password,
        address: address?.trim() || "",
        phone: phone?.trim() || "",
        website: website?.trim() || "",
      });

      return res.status(201).json({
        success: true,
        storeId: store.id,
        email: normalizedEmail,
      });
    } catch (err) {
      console.error("[stores/register] error:", err);
      return res.status(500).json({ error: "Failed to register store" });
    }
  });

  // ------------------ STORES: SELECT PLAN (AUTH) ------------------
  router.post(
    "/stores/select-plan",
    auth("store"),
    async (req: AuthRequest, res) => {
      try {
        const { plan } = req.body as { plan?: string };

        if (!plan || !["basic", "pro", "premium"].includes(plan)) {
          return res.status(400).json({ error: "Invalid plan" });
        }

        if (!req.user?.storeId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const updated = await storage.updateStore(req.user.storeId, {
          plan,
          billingStatus: "pending",
          planSelectedAt: new Date().toISOString(),
        } as any);

        if (!updated) {
          return res.status(500).json({ error: "Failed to update store" });
        }

        return res.json({
          success: true,
          plan: (updated as any).plan,
          billingStatus: (updated as any).billingStatus,
        });
      } catch (err) {
        console.error("[stores/select-plan] error:", err);
        return res.status(500).json({ error: "Server error" });
      }
    },
  );

  // ------------------ STORES: POSTS FOR ONE STORE (PROFILE) ------------------
  router.get("/stores/:storeId/posts", async (req, res) => {
    try {
      const storeId = req.params.storeId;
      const posts = await storage.getPostsByStore(storeId);
      const mapped = await Promise.all(posts.map((p: any) => mapPostToFrontend(p, req)));
      res.json(mapped);
    } catch (err) {
      console.error("store posts error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ POSTS: LIST ALL (MEÐ PLAN RÖÐUN) ------------------
  router.get("/posts", async (req, res) => {
    try {
      const q = (req.query.q as string)?.toLowerCase() || "";

      const [posts, stores] = await Promise.all([
        storage.listPosts(),
        storage.listStores(),
      ]);

      const storesById: Record<string, any> = {};
      for (const s of stores as any[]) {
        storesById[s.id] = s;
      }

      const filtered = q
        ? posts.filter((p: any) => (p.title || "").toLowerCase().includes(q))
        : posts;

      filtered.sort((a: any, b: any) => {
        const pa = getPlanRankForPost(a, storesById);
        const pb = getPlanRankForPost(b, storesById);

        if (pb !== pa) return pb - pa;

        const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;

        return bd - ad;
      });

      const mapped = await Promise.all(filtered.map((p: any) => mapPostToFrontend(p, req)));
      res.json(mapped);
    } catch (err) {
      console.error("list posts error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ POSTS: DETAIL (MEÐ “ANTI DOUBLE COUNT”) ------------------
  router.get("/posts/:id", async (req, res) => {
    try {
      const all = await storage.listPosts();
      const post = all.find((p: any) => p.id === req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Tilboð fannst ekki" });
      }

      // hér kemur restin af kóðanum ÓBREYTT

      // Einföld IP-greining
      const ipHeader = (req.headers["x-forwarded-for"] as string) || "";
      const clientIp = ipHeader.split(",")[0]?.trim() || req.ip || "unknown_ip";

      const key = `${clientIp}:${req.params.id}`;
      const now = Date.now();
      const last = lastViewCache[key] ?? 0;

      let effective = post;

      // Ef liðið er meira en VIEW_DEDUP_WINDOW_MS frá síðustu talningu → teljum sem nýja skoðun
      if (now - last > VIEW_DEDUP_WINDOW_MS) {
        const currentCount = (post as any).viewCount ?? 0;
        const updated = await storage.updatePost(post.id, {
          viewCount: currentCount + 1,
        } as any);

        if (updated) {
          effective = updated;
        }
        lastViewCache[key] = now;
      }

      const mapped = await mapPostToFrontend(effective, req);
      res.json(mapped);
    } catch (err) {
      console.error("post detail error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ POSTS: CREATE ------------------
  router.post(
    "/posts",
    auth("store"),
    requirePlanSelected,
    async (req: AuthRequest, res) => {
      try {
        const storeId = req.user?.storeId;

        if (!storeId) {
          return res.status(401).json({ message: "Ekki innskráð verslun" });
        }

        const {
          title,
          description,
          category,
          priceOriginal,
          priceSale,
          buyUrl,
          startsAt,
          endsAt,
          images,
        } = req.body;

        if (!title || priceOriginal == null || priceSale == null || !category) {
          return res.status(400).json({ message: "Vantar upplýsingar" });
        }

        const imageUrl =
          Array.isArray(images) && images.length > 0 ? images[0].url : "";

        const newPost = await storage.createPost({
          title,
          description,
          category,
          price: Number(priceSale),
          oldPrice: Number(priceOriginal),
          imageUrl,
          storeId,
          buyUrl: buyUrl || null,
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          createdAt: new Date().toISOString(),
          viewCount: 0,
        } as any);

        const mapped = await mapPostToFrontend(newPost, req);
        return res.json(mapped);
      } catch (err) {
        console.error("create post error", err);
        return res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ POSTS: UPDATE ------------------
  router.put(
    "/posts/:id",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        const postId = req.params.id;
        const all = await storage.listPosts();
        const existing = all.find((p: any) => p.id === postId);

        if (!existing) {
          return res.status(404).json({ message: "Færsla fannst ekki" });
        }

        if (existing.storeId !== req.user?.storeId) {
          return res.status(403).json({ message: "Ekki heimild" });
        }

        const {
          title,
          description,
          category,
          priceOriginal,
          priceSale,
          buyUrl,
          startsAt,
          endsAt,
          images,
        } = req.body;

        const updates: any = {};

        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (category !== undefined) updates.category = category;
        if (priceOriginal !== undefined)
          updates.oldPrice = Number(priceOriginal);
        if (priceSale !== undefined) updates.price = Number(priceSale);
        if (buyUrl !== undefined) updates.buyUrl = buyUrl || null;
        if (startsAt !== undefined) updates.startsAt = startsAt || null;
        if (endsAt !== undefined) updates.endsAt = endsAt || null;

        if (Array.isArray(images) && images.length > 0 && images[0].url) {
          updates.imageUrl = images[0].url;
        }

        const updated = await storage.updatePost(postId, updates);
        if (!updated) {
          return res.status(500).json({ message: "Tókst ekki að uppfæra" });
        }

        const mapped = await mapPostToFrontend(updated, req);
        res.json(mapped);
      } catch (err) {
        console.error("update post error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ POSTS: DELETE (STORE OWN) ------------------
  router.delete(
    "/posts/:id",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        const postId = req.params.id;
        const all = await storage.listPosts();
        const target = all.find((p: any) => p.id === postId);

        if (!target) {
          return res.status(404).json({ message: "Færsla fannst ekki" });
        }

        if (target.storeId !== req.user?.storeId) {
          return res.status(403).json({ message: "Ekki heimild" });
        }

        const deleted = await storage.deletePost(postId);
        res.json({ success: deleted });
      } catch (err) {
        console.error("delete post error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ UPLOAD IMAGE (SINGLE SOURCE OF TRUTH) ------------------
  router.post(
    "/uploads/image",
    auth("store"),
    upload.single("image"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Engin mynd móttekin" });
        }

        const relativePath = `/uploads/${req.file.filename}`;
        const absoluteUrl = toAbsoluteImageUrl(relativePath, req);

        return res.status(200).json({
          imageUrl: absoluteUrl,
        });
      } catch (err) {
        console.error("upload image error", err);
        return res.status(500).json({ message: "Myndaupphleðsla mistókst" });
      }
    },
  );

  // ===================== ADMIN ROUTES =====================

  // GET /admin/posts – allar auglýsingar
  router.get("/admin/posts", authAdmin, async (req: AuthRequest, res) => {
    try {
      const posts = await storage.listPosts();
      const stores = await storage.listStores();
      const storeMap: Record<string, any> = {};
      for (const s of stores as any[]) storeMap[s.id] = s;

      const result = (posts as any[]).map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category ?? null,
        price: p.price ?? p.priceSale ?? 0,
        oldPrice: p.oldPrice ?? p.priceOriginal ?? 0,
        imageUrl: p.imageUrl ?? null,
        storeId: p.storeId ?? null,
        storeName: p.storeId ? (storeMap[p.storeId]?.name ?? "Óþekkt") : "Óþekkt",
        createdAt: p.createdAt ?? null,
      }));

      res.json(result);
    } catch (err) {
      console.error("admin/posts error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // DELETE /admin/posts/:id – eyða hvaða auglýsingu sem er
  router.delete("/admin/posts/:id", authAdmin, async (req: AuthRequest, res) => {
    try {
      const deleted = await storage.deletePost(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Auglýsing fannst ekki" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("admin/delete post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // GET /admin/stores – allar verslanir með notendaupplýsingar
  router.get("/admin/stores", authAdmin, async (req: AuthRequest, res) => {
    try {
      const stores = await storage.listStores();
      const users = await storage.listUsers();

      const result = (stores as any[]).map((s) => {
        const owner = users.find((u: any) => u.storeId === s.id);
        return {
          id: s.id,
          name: s.name,
          email: owner?.email ?? s.ownerEmail ?? null,
          userId: owner?.id ?? null,
          plan: s.plan ?? "basic",
          billingStatus: s.billingStatus ?? "trial",
          trialEndsAt: s.trialEndsAt ?? null,
          createdAt: s.createdAt ?? null,
        };
      });

      res.json(result);
    } catch (err) {
      console.error("admin/stores error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // DELETE /admin/stores/:storeId – eyða verslun, notanda og öllum auglýsingum
  router.delete("/admin/stores/:storeId", authAdmin, async (req: AuthRequest, res) => {
    try {
      const { storeId } = req.params;

      const posts = await storage.listPosts();
      for (const p of posts as any[]) {
        if (p.storeId === storeId) await storage.deletePost(p.id);
      }

      const users = await storage.listUsers();
      const owner = users.find((u: any) => u.storeId === storeId);
      if (owner) await storage.deleteUser(owner.id);

      await storage.deleteStore(storeId);

      res.json({ success: true });
    } catch (err) {
      console.error("admin/delete store error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ ONE-TIME ADMIN PROMOTION ------------------
  router.post("/promote-admin", async (req: Request, res: Response) => {
    try {
      const { email, secret } = req.body;
      const PROMOTE_SECRET = "UtsalApp2026Admin!";

      if (!secret || secret !== PROMOTE_SECRET) {
        return res.status(403).json({ message: "Rangt leyniorð" });
      }

      const targetEmail = (email || "gisli@utsalapp.is").trim().toLowerCase();
      const user = await storage.findUserByEmail(targetEmail);
      if (!user) {
        return res.status(404).json({ message: "Notandi fannst ekki" });
      }

      await storage.updateUser(user.id, { isAdmin: true });
      res.json({ success: true, message: `${targetEmail} er nú admin` });
    } catch (err) {
      console.error("promote-admin error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ⬅️ MOUNT API ROUTER (EINU SINNI)
  app.use("/api/v1", router);

  // ------------------ STATIC FILES & SPA FALLBACK ------------------
  const clientDistPath = path.join(process.cwd(), "client", "dist");

  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
        return next();
      }

      return res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  // ⬅️ LOKAR registerRoutes(app)
}
