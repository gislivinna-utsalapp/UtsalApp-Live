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
import { UPLOAD_DIR } from "./config/uploads";

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

function isTrialExpired(store: any): boolean {
  if (!store) return true;
  if (store.billingStatus === "active") return false;
  if (!store.trialEndsAt) return false;

  const ts = new Date(store.trialEndsAt).getTime();
  if (!Number.isFinite(ts)) return false;

  return Date.now() > ts;
}

// Middleware: verslun þarf að vera í trial eða active til að búa til tilboð
async function requireActiveOrTrialStore(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user?.storeId) {
      return res
        .status(400)
        .json({ message: "Engin tengd verslun fannst fyrir notanda" });
    }

    let store = await storage.getStoreById(req.user.storeId);
    if (!store) {
      return res.status(404).json({ message: "Verslun fannst ekki" });
    }

    // Ef verslun hefur ekki fengið trial áður og er ekki expired → gefum 7 daga frá núna
    if (
      !(store as any).trialEndsAt &&
      (store as any).billingStatus !== "expired"
    ) {
      const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
      const updated = await storage.updateStore(store.id, {
        trialEndsAt,
        billingStatus: (store as any).billingStatus ?? "trial",
      } as any);
      if (updated) {
        store = updated;
      }
    }

    // Ef trial er útrunnið og ekki active → stoppa
    if (isTrialExpired(store)) {
      if ((store as any).billingStatus !== "expired") {
        await storage.updateStore(store.id, {
          billingStatus: "expired",
        } as any);
      }

      return res.status(403).json({
        message:
          "Fríviku þinni er lokið. Hafðu samband við ÚtsalApp til að virkja áskrift.",
      });
    }

    next();
  } catch (err) {
    console.error("requireActiveOrTrialStore error", err);
    res.status(500).json({ message: "Villa kom upp" });
  }
}

// ------------------------- MAPPA POST Í FRONTEND FORMAT -------------------------

async function mapPostToFrontend(p: any) {
  const store = p.storeId ? await storage.getStoreById(p.storeId) : null;

  const plan = (store as any)?.plan ?? (store as any)?.planType ?? "basic";
  const billingStatus =
    (store as any)?.billingStatus ??
    ((store as any)?.billingActive ? "active" : "trial");

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,

    priceOriginal: Number(p.oldPrice ?? p.priceOriginal ?? 0),
    priceSale: Number(p.price ?? p.priceSale ?? 0),

    images: p.imageUrl
      ? [
          {
            url: p.imageUrl,
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
          planType: plan, // fyrir eldri client
          billingStatus,
          createdAt: (store as any).createdAt ?? null, // BÆTT VIÐ
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

  // Static fyrir uploads
  app.use("/uploads", express.static(UPLOAD_DIR));

  // ------------------ AUTH: REGISTER STORE ------------------
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
      const password = rawPassword;

      // ===== ACCESS LOGIC: PRUFUVIKA =====
      const now = new Date();
      const trialDays = 7;
      const accessEndsAt = new Date(
        now.getTime() + trialDays * 24 * 60 * 60 * 1000,
      ).toISOString();
      // ==================================

      const store = await createStore({
        name: storeName,
        email,
        password,
        address,
        phone,
        website,

        // 👇 NÝTT – þetta er lykillinn
        accessEndsAt,
        trialEndsAt: accessEndsAt,
      });

      return res.status(201).json({
        ok: true,
        store: {
          id: store.id,
          name: store.name,
          accessEndsAt: store.accessEndsAt,
        },
      });
    } catch (err) {
      console.error("register-store error:", err);
      return res.status(500).json({ error: "Failed to register store" });
    }
  });

  // helper function – má vera utan routes
  function normalizeEmail(rawEmail?: string): string {
    return (rawEmail ?? "").trim().toLowerCase();
  }

  // ------------------ AUTH: REGISTER STORE (LEGACY ALIAS) ------------------
  router.post("/stores/register", async (req, res) => {
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
        rawEmail?: string;
        rawPassword?: string;
        address?: string;
        phone?: string;
        website?: string;
      };

      const email = (rawEmail ?? "").trim().toLowerCase();
      const password = (rawPassword ?? "").trim();

      if (!storeName || !email || !password) {
        return res.status(400).json({ message: "Vantar upplýsingar" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();

      const store = await storage.createStore({
        name: storeName,
        address: (address ?? "").trim(),
        phone: (phone ?? "").trim(),
        website: (website ?? "").trim(),
        logoUrl: "",
        ownerEmail: email,
        plan: "basic",
        trialEndsAt,
        billingStatus: "trial",
      } as any);

      const user = await storage.createUser({
        email,
        passwordHash,
        role: "store",
        storeId: store.id,
      } as any);

      const billingActive = true;

      return res.json({
        message: "Verslun skráð",
        user: { id: user.id, email: user.email, role: user.role },
        store: {
          id: store.id,
          name: store.name,
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
          plan: (store as any).plan ?? "basic",
          planType: (store as any).plan ?? "basic",
          trialEndsAt: (store as any).trialEndsAt ?? null,
          billingStatus: (store as any).billingStatus ?? "trial",
          billingActive,
          createdAt: (store as any).createdAt ?? null,
        },
      });
    } catch (err) {
      console.error("register-store error", err);
      return res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ AUTH: LOGIN ------------------
  router.post("/auth/login", async (req: Request, res: Response) => {
    try {
      const rawEmail = (req.body?.email ?? "") as string;
      const rawPassword = (req.body?.password ?? "") as string;

      const email = rawEmail.trim().toLowerCase();
      const password = rawPassword.trim();

      if (!email || !password) {
        return res.status(400).json({ message: "Vantar netfang og lykilorð" });
      }

      const user = await storage.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Rangt netfang eða lykilorð" });
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: "Rangt netfang eða lykilorð" });
      }

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

      let storePayload: any = null;

      if (store) {
        const plan = (store as any).plan ?? "basic";
        const billingStatus =
          (store as any).billingStatus ??
          ((store as any).billingActive ? "active" : "trial");

        const billingActive =
          billingStatus === "active" || billingStatus === "trial";

        storePayload = {
          id: store.id,
          name: store.name,
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
          plan,
          planType: plan,
          trialEndsAt: (store as any).trialEndsAt ?? null,
          billingStatus,
          billingActive,
          createdAt: (store as any).createdAt ?? null,
        };
      }

      return res.json({
        user: {
          id: user.id,
          email,
          role: user.role,
          isAdmin,
        },
        store: storePayload,
        token,
      });
    } catch (err) {
      console.error("login error:", err);
      return res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ AUTH: ME ------------------
  // ------------------ AUTH: ME ------------------
  router.get("/auth/me", auth(), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Ekki innskráður" });
      }

      let store = req.user.storeId
        ? await storage.getStoreById(req.user.storeId)
        : null;

      let storePayload: any = null;

      if (store) {
        storePayload = {
          id: store.id,
          name: store.name,
          plan: (store as any).plan ?? "basic",
          trialEndsAt: (store as any).trialEndsAt ?? null,
          billingStatus: (store as any).billingStatus ?? "trial",
        };
      }

      return res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          isAdmin: (req.user as any).isAdmin === true,
        },
        store: storePayload,
      });
    } catch (err) {
      console.error("auth/me error", err);
      return res.status(500).json({ message: "Villa kom upp" });
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

  // ------------------ STORES: POSTS FOR ONE STORE (PROFILE) ------------------
  router.get("/stores/:storeId/posts", async (req, res) => {
    try {
      const storeId = req.params.storeId;
      const posts = await storage.getPostsByStore(storeId);
      const mapped = await Promise.all(posts.map(mapPostToFrontend));
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

      const mapped = await Promise.all(filtered.map(mapPostToFrontend));
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

      const mapped = await mapPostToFrontend(effective);
      res.json(mapped);
    } catch (err) {
      console.error("post detail error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ------------------ POSTS: CREATE ------------------
  router.post("/posts", auth("store"), async (req: AuthRequest, res) => {
    try {
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(401).json({ message: "Ekki innskráð verslun" });
      }

      const store = await storage.getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ message: "Verslun fannst ekki" });
      }

      // 🔒 AÐGANGSSTÝRING – SINGLE SOURCE OF TRUTH
      if (!store.accessEndsAt || new Date(store.accessEndsAt) <= new Date()) {
        return res.status(403).json({
          message: "Aðgangur verslunar er útrunninn",
          accessEndsAt: store.accessEndsAt ?? null,
        });
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

      const mapped = await mapPostToFrontend(newPost);
      res.json(mapped);
    } catch (err) {
      console.error("create post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

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

        const mapped = await mapPostToFrontend(updated);
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

        return res.status(200).json({
          imageUrl: `/uploads/${req.file.filename}`,
        });
      } catch (err) {
        console.error("upload image error", err);
        return res.status(500).json({ message: "Myndaupphleðsla mistókst" });
      }
    },
  );

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
