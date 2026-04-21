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
import {
  getAllEvents,
  getEventsBySession,
  getSessionSummary,
  getDbSummary,
  queryAnalytics,
  logEvent,
  type EventType,
} from "./session-tracker";
import { analyzeQuery } from "./search-analyzer";

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
    const allowed = ["basic", "pro", "premium", "unlimited"];

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

  const allUrls: string[] = [];

  // Format 1: images: [{url, alt}] (new schema)
  if (Array.isArray(p.images) && p.images.length > 0) {
    for (const img of p.images) {
      const u = typeof img === "string" ? img : img?.url;
      if (u && typeof u === "string" && u.trim()) {
        const resolved = req ? toAbsoluteImageUrl(u, req) : u;
        if (resolved) allUrls.push(resolved);
      }
    }
  }
  // Format 2: imageUrls: [string] (legacy)
  if (allUrls.length === 0 && Array.isArray(p.imageUrls) && p.imageUrls.length > 0) {
    for (const u of p.imageUrls) {
      if (typeof u === "string" && u.trim()) {
        const resolved = req ? toAbsoluteImageUrl(u, req) : u;
        if (resolved) allUrls.push(resolved);
      }
    }
  }
  // Format 3: imageUrl: string (oldest legacy)
  if (allUrls.length === 0 && p.imageUrl) {
    const resolved = req ? toAbsoluteImageUrl(p.imageUrl, req) : p.imageUrl;
    if (resolved) allUrls.push(resolved);
  }

  return {
    id: p.id,
    title: p.title,
    description: p.description,
    category: p.category,

    priceOriginal: Number(p.oldPrice ?? p.priceOriginal ?? 0),
    priceSale: Number(p.price ?? p.priceSale ?? 0),

    images: allUrls.map((url, i) => ({
      url,
      alt: (Array.isArray(p.images) && p.images[i]?.alt) ? p.images[i].alt : p.title,
    })),

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

// ─── Discovery feed helpers ───────────────────────────────────────────────────

/** Fast, seedable pseudo-random number generator (mulberry32). */
function seededRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

/** Fisher-Yates shuffle using the supplied rand function. */
function shuffleArr<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds a discovery feed ordered by:
 *  1. Plan tier (premium > pro > basic) — paid visibility is preserved.
 *  2. Within each tier: 40 % new offers, 30 % category-diverse, 30 % random.
 *
 * Seed rotates every 30 minutes so pagination is consistent within a session
 * but the order feels fresh on each new visit.
 */
function buildDiscoveryFeed(
  posts: any[],
  storesById: Record<string, any>,
): any[] {
  const seed = Math.floor(Date.now() / (1000 * 60 * 30));
  const rand = seededRandom(seed);

  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  // ── 1. Split by plan tier ────────────────────────────────────────────────
  const tiers: Record<number, any[]> = { 3: [], 2: [], 1: [] };
  for (const p of posts) {
    const r = getPlanRankForPost(p, storesById);
    tiers[r].push(p);
  }

  const result: any[] = [];

  for (const rank of [3, 2, 1]) {
    const group = tiers[rank];
    if (!group.length) continue;

    // ── 2. Classify posts within the tier ──────────────────────────────────
    const isNew = (p: any) =>
      p.createdAt && now - new Date(p.createdAt).getTime() < WEEK_MS;

    const discountPct = (p: any) =>
      typeof p.priceOriginal === "number" &&
      typeof p.priceSale === "number" &&
      p.priceOriginal > 0
        ? (p.priceOriginal - p.priceSale) / p.priceOriginal
        : 0;

    const newPosts = group.filter(isNew);
    const oldPosts = group.filter((p) => !isNew(p));
    const highDiscount = oldPosts.filter((p) => discountPct(p) >= 0.25);
    const regular = oldPosts.filter((p) => discountPct(p) < 0.25);

    // ── 3. Category-diverse picks (round-robin across categories) ──────────
    const byCategory: Record<string, any[]> = {};
    for (const p of shuffleArr(regular, rand)) {
      const cat = (p.category as string) || "other";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(p);
    }
    const catQueues = Object.values(byCategory);
    const catPicks: any[] = [];
    while (catQueues.some((q) => q.length > 0)) {
      for (const q of catQueues) {
        if (q.length) catPicks.push(q.shift()!);
      }
    }

    // ── 4. Slot counts ────────────────────────────────────────────────────
    const n = group.length;
    const wantNew = Math.round(n * 0.4);
    const wantCat = Math.round(n * 0.3);

    const seen = new Set<string>();
    const pick = (arr: any[], max: number): any[] => {
      const out: any[] = [];
      for (const p of arr) {
        if (out.length >= max) break;
        if (!seen.has(p.id)) {
          seen.add(p.id);
          out.push(p);
        }
      }
      return out;
    };

    const newSlice = pick(shuffleArr(newPosts, rand), wantNew);
    const catSlice = pick(
      [...shuffleArr(highDiscount, rand), ...catPicks],
      wantCat,
    );
    // "Random" fills whatever slots remain
    const randSlice = pick(
      shuffleArr([...newPosts, ...highDiscount, ...regular], rand),
      n,
    );

    // ── 5. Interleave: new / category / random in 4-item stride ───────────
    //    Pattern per stride: [new, cat, rand, rand] → slight random weight
    const qN = [...newSlice];
    const qC = [...catSlice];
    const qR = [...randSlice];
    const merged: any[] = [];
    while (qN.length || qC.length || qR.length) {
      if (qN.length) merged.push(qN.shift()!);
      if (qC.length) merged.push(qC.shift()!);
      if (qR.length) merged.push(qR.shift()!);
      if (qR.length) merged.push(qR.shift()!);
    }

    // ── 6. Final dedup safety pass ────────────────────────────────────────
    const dedupSeen = new Set<string>();
    result.push(
      ...merged.filter((p) => {
        if (dedupSeen.has(p.id)) return false;
        dedupSeen.add(p.id);
        return true;
      }),
    );
  }

  return result;
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

      // 3️⃣ 🔑 AUTO-LOGIN – JWT token strax
      const isAdmin = (user as any).isAdmin === true;
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          storeId: store.id,
          isAdmin,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      // Session fallback
      try {
        (req.session as any).user = {
          id: user.id,
          role: "store",
          storeId: store.id,
        };
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => (err ? reject(err) : resolve()));
        });
      } catch {}

      // 4️⃣ Response – sama format og login
      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isAdmin,
        },
        store: {
          id: store.id,
          name: store.name,
          plan: (store as any).plan ?? "basic",
          billingStatus: (store as any).billingStatus ?? "trial",
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
        },
        token,
      });
    } catch (err) {
      console.error("[auth/register-store] error:", err);
      return res.status(500).json({ error: "Failed to register store" });
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

      let passwordOk = false;
      const storedHash = user.passwordHash || (user as any).password || null;

      if (storedHash && storedHash.startsWith("$2")) {
        passwordOk = await bcrypt.compare(password, storedHash);
      }

      // Legacy fallback (plain password upgrade)
      if (!passwordOk && (user as any).password === password) {

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
        const allowed = ["basic", "pro", "premium", "unlimited"];

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

  // ------------------ STORES: UPLOAD LOGO ------------------
  router.post(
    "/stores/me/logo",
    auth("store"),
    upload.single("logo"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        if (!req.file) {
          return res.status(400).json({ message: "Engin mynd móttekin" });
        }

        const relativePath = `/uploads/${req.file.filename}`;
        const absoluteUrl = toAbsoluteImageUrl(relativePath, req);

        await storage.updateStore(req.user.storeId, { logoUrl: absoluteUrl });

        return res.json({ logoUrl: absoluteUrl });
      } catch (err) {
        console.error("upload logo error:", err);
        return res.status(500).json({ message: "Myndaupphleðsla mistókst" });
      }
    },
  );

  // ------------------ STORES: UPLOAD COVER IMAGE ------------------
  router.post(
    "/stores/me/cover",
    auth("store"),
    upload.single("cover"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        if (!req.file) {
          return res.status(400).json({ message: "Engin mynd móttekin" });
        }
        const relativePath = `/uploads/${req.file.filename}`;
        const absoluteUrl = toAbsoluteImageUrl(relativePath, req);
        await storage.updateStore(req.user.storeId, { coverUrl: absoluteUrl } as any);
        return res.json({ coverUrl: absoluteUrl });
      } catch (err) {
        console.error("upload cover error:", err);
        return res.status(500).json({ message: "Myndaupphleðsla mistókst" });
      }
    },
  );

  // ------------------ STORES: SAVE COVER POSITION ------------------
  router.post(
    "/stores/me/cover-position",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        const positionY = Number(req.body.positionY);
        if (!Number.isFinite(positionY)) {
          return res.status(400).json({ message: "Ógild staðsetning" });
        }
        const clamped = Math.min(100, Math.max(0, positionY));
        await storage.updateStore(req.user.storeId, { coverPositionY: clamped } as any);
        return res.json({ coverPositionY: clamped });
      } catch (err) {
        console.error("cover-position error:", err);
        return res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // ------------------ STORES: UPDATE PUBLIC INFO ------------------
  router.post(
    "/stores/me/update-info",
    auth("store"),
    async (req: AuthRequest, res: Response) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }

        const { name, address, phone, website } = req.body;
        const updates: Record<string, any> = {};
        if (typeof name === "string" && name.trim()) updates.name = name.trim();
        if (typeof address === "string") updates.address = address.trim();
        if (typeof phone === "string") updates.phone = phone.trim();
        if (typeof website === "string") updates.website = website.trim();

        if (Object.keys(updates).length === 0) {
          return res.status(400).json({ message: "Engar breytingar fundust" });
        }

        const updated = await storage.updateStore(req.user.storeId, updates);
        if (!updated) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }

        return res.json({
          id: (updated as any).id,
          name: (updated as any).name,
          address: (updated as any).address ?? "",
          phone: (updated as any).phone ?? "",
          website: (updated as any).website ?? "",
          logoUrl: (updated as any).logoUrl ?? "",
        });
      } catch (err) {
        console.error("update-info error:", err);
        return res.status(500).json({ message: "Villa kom upp" });
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
        logoUrl: (store as any).logoUrl ?? "",
        coverUrl: (store as any).coverUrl ?? "",
        coverPositionY: (store as any).coverPositionY ?? 50,
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

        if (!plan || !["basic", "pro", "premium", "unlimited"].includes(plan)) {
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

  // ─── SEARCH ANALYZER ─────────────────────────────────────────────────────
  //
  // POST /analyze-search
  // Accepts: { "query": "tilboð á húsgögnum í Reykjavík" }
  // Returns: { category, location, intent, keywords, confidence, raw_query }
  //
  // Designed to be called before or alongside the main search to enrich the
  // query with structured entities. The result can later feed ML pipelines.
  //
  router.post("/analyze-search", (req: Request, res: Response) => {
    const raw: unknown = req.body?.query;
    if (typeof raw !== "string" || !raw.trim()) {
      return res
        .status(400)
        .json({ message: "Vantar 'query' reit í JSON líkama" });
    }

    const result = analyzeQuery(raw);

    // Log as a "search" interaction so analytics captures NLP queries too
    logEvent(req as any, "search", raw.trim(), {
      q: raw.trim(),
      category: result.category,
      location: result.location,
      intent: result.intent,
    });

    return res.json(result);
  });

  // Also expose as GET for easy browser/Postman testing:
  // GET /analyze-search?q=tilboð+á+húsgögnum+í+Reykjavík
  router.get("/analyze-search", (req: Request, res: Response) => {
    const raw = (req.query.q as string)?.trim();
    if (!raw) {
      return res
        .status(400)
        .json({ message: "Vantar 'q' færibreytu í slóð" });
    }
    return res.json(analyzeQuery(raw));
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

      // Search results stay chronological; the main feed uses discovery ordering.
      let ordered: any[];
      if (q) {
        // Search: sort by plan rank then newest first (intent-driven)
        ordered = [...filtered].sort((a: any, b: any) => {
          const pa = getPlanRankForPost(a, storesById);
          const pb = getPlanRankForPost(b, storesById);
          if (pb !== pa) return pb - pa;
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bd - ad;
        });
      } else {
        // Discovery feed: 40% new, 30% category-diverse, 30% random (per plan tier)
        ordered = buildDiscoveryFeed(filtered, storesById);
      }

      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 40));
      const total = ordered.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = ordered.slice((page - 1) * limit, page * limit);

      const mapped = await Promise.all(paginated.map((p: any) => mapPostToFrontend(p, req)));
      res.json({ posts: mapped, total, page, totalPages });
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
        const imageUrls: string[] = Array.isArray(images)
          ? images.map((img: any) => img.url).filter((u: any) => typeof u === "string" && u.trim())
          : [];

        const newPost = await storage.createPost({
          title,
          description,
          category,
          price: Number(priceSale),
          oldPrice: Number(priceOriginal),
          imageUrl,
          imageUrls,
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
          updates.imageUrls = images
            .map((img: any) => img.url)
            .filter((u: any) => typeof u === "string" && u.trim());
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
        imageUrl: p.imageUrl
          ?? (Array.isArray(p.images) && p.images[0]?.url ? p.images[0].url : null),
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

  // ─── AD TRACKING (public) ─────────────────────────────────────────────────

  // POST /analytics/ad-event  – record impression or click for a post (no auth needed)
  router.post("/analytics/ad-event", async (req: Request, res: Response) => {
    try {
      const { postId, eventType, postTitle, storeName } = req.body as {
        postId?: string;
        eventType?: "impression" | "click";
        postTitle?: string;
        storeName?: string;
      };
      if (!postId || !eventType || !["impression", "click"].includes(eventType)) {
        return res.status(400).json({ ok: false });
      }
      const sessionId =
        (req as any).utsalSessionId ||
        req.cookies?.utsalapp_sid ||
        "anon";
      logEvent(req as any, eventType as any, postId, { postTitle, storeName });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[ad-event]", err);
      return res.json({ ok: false });
    }
  });

  // GET /admin/analytics/ads – per-ad aggregated stats (admin)
  // ?since=2025-01-01  (optional ISO date string)
  router.get("/admin/analytics/ads", authAdmin, async (req, res) => {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const until = req.query.until ? new Date(req.query.until as string) : undefined;
      const { Pool } = await import("pg");
      const pool = new (Pool as any)({
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        max: 3,
        ssl: process.env.PGHOST !== "localhost" && process.env.PGHOST !== "helium"
          ? { rejectUnauthorized: false } : false,
      });
      const dateParams: string[] = [];
      const dateClauses: string[] = [];
      if (since) { dateParams.push(since.toISOString()); dateClauses.push(`AND timestamp >= $${dateParams.length}`); }
      if (until) { dateParams.push(until.toISOString()); dateClauses.push(`AND timestamp <= $${dateParams.length}`); }
      const dateFilter = dateClauses.join(" ");
      const result = await pool.query(`
        SELECT
          target                                           AS post_id,
          SUM(CASE WHEN event_type='impression' THEN 1 ELSE 0 END) AS impressions,
          SUM(CASE WHEN event_type='click'      THEN 1 ELSE 0 END) AS clicks,
          MAX(meta->>'postTitle')                          AS post_title,
          MAX(meta->>'storeName')                          AS store_name,
          MIN(timestamp)                                   AS first_seen,
          MAX(timestamp)                                   AS last_seen
        FROM interactions
        WHERE event_type IN ('impression','click') AND target IS NOT NULL ${dateFilter}
        GROUP BY target
        ORDER BY impressions DESC
        LIMIT 200
      `, dateParams);
      await pool.end();
      const rows = result.rows.map((r: any) => ({
        postId: r.post_id,
        postTitle: r.post_title ?? r.post_id,
        storeName: r.store_name ?? "—",
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        ctr: r.impressions > 0
          ? Math.round((Number(r.clicks) / Number(r.impressions)) * 1000) / 10
          : 0,
        firstSeen: r.first_seen,
        lastSeen: r.last_seen,
      }));
      return res.json(rows);
    } catch (err) {
      console.error("[analytics/ads]", err);
      return res.status(500).json({ message: "Villa í greiningum" });
    }
  });

  // ─── ANALYTICS PER STORE (admin-only) ──────────────────────────────────────

  router.get("/admin/analytics/store/:storeId", authAdmin, async (req, res) => {
    try {
      const { storeId } = req.params;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const until = req.query.until ? new Date(req.query.until as string) : undefined;

      const store = await storage.getStoreById(storeId);
      if (!store) return res.status(404).json({ message: "Verslun fannst ekki" });

      const allPosts = await storage.listPosts();
      const storePosts = (allPosts as any[]).filter((p) => p.storeId === storeId);

      const postIds = storePosts.map((p: any) => p.id);
      const totalPostViews = storePosts.reduce((s: number, p: any) => s + (p.viewCount || 0), 0);

      // Build date filter clauses
      const dateParams: (string | any)[] = [];
      const dateClauses: string[] = [];
      if (since) { dateParams.push(since.toISOString()); dateClauses.push(`AND timestamp >= $${dateParams.length}`); }
      if (until) { dateParams.push(until.toISOString()); dateClauses.push(`AND timestamp <= $${dateParams.length}`); }
      const dateFilter = dateClauses.join(" ");

      // Pull ad stats + store-page views from PG
      let adRows: any[] = [];
      let storePageViews = 0;
      try {
        const { Pool } = await import("pg");
        const pool = new (Pool as any)({
          host: process.env.PGHOST, port: Number(process.env.PGPORT) || 5432,
          user: process.env.PGUSER, password: process.env.PGPASSWORD,
          database: process.env.PGDATABASE, max: 2,
          ssl: process.env.PGHOST !== "localhost" && process.env.PGHOST !== "helium"
            ? { rejectUnauthorized: false } : false,
        });
        if (postIds.length > 0) {
          const placeholders = postIds.map((_: any, i: number) => `$${dateParams.length + i + 1}`).join(",");
          const adResult = await pool.query(
            `SELECT target AS post_id,
               SUM(CASE WHEN event_type='impression' THEN 1 ELSE 0 END) AS impressions,
               SUM(CASE WHEN event_type='click' THEN 1 ELSE 0 END) AS clicks,
               MAX(meta->>'postTitle') AS post_title
             FROM interactions
             WHERE event_type IN ('impression','click') AND target IN (${placeholders}) ${dateFilter}
             GROUP BY target`,
            [...dateParams, ...postIds]
          );
          adRows = adResult.rows;
        }
        const viewParamIdx = dateParams.length + 1;
        const viewResult = await pool.query(
          `SELECT COUNT(*) AS cnt FROM interactions WHERE path LIKE $${viewParamIdx} ${dateFilter}`,
          [...dateParams, `%/stores/${storeId}%`]
        );
        storePageViews = Number(viewResult.rows[0]?.cnt) || 0;
        await pool.end();
      } catch (_) {}

      const adByPostId: Record<string, { impressions: number; clicks: number }> = {};
      for (const r of adRows) {
        adByPostId[r.post_id] = { impressions: Number(r.impressions) || 0, clicks: Number(r.clicks) || 0 };
      }

      const totalImpressions = adRows.reduce((s: number, r: any) => s + (Number(r.impressions) || 0), 0);
      const totalClicks = adRows.reduce((s: number, r: any) => s + (Number(r.clicks) || 0), 0);

      const users = await storage.listUsers();
      const owner = (users as any[]).find((u) => u.storeId === storeId);

      return res.json({
        store: {
          id: (store as any).id,
          name: (store as any).name,
          email: owner?.email ?? null,
          plan: (store as any).plan ?? "basic",
          billingStatus: (store as any).billingStatus ?? "trial",
          createdAt: (store as any).createdAt ?? null,
        },
        summary: {
          postCount: storePosts.length,
          totalPostViews,
          totalImpressions,
          totalClicks,
          storePageViews,
          ctr: totalImpressions > 0 ? Math.round((totalClicks / totalImpressions) * 1000) / 10 : 0,
        },
        posts: storePosts.map((p: any) => ({
          id: p.id,
          title: p.title,
          viewCount: p.viewCount || 0,
          impressions: adByPostId[p.id]?.impressions ?? 0,
          clicks: adByPostId[p.id]?.clicks ?? 0,
          endsAt: p.endsAt ?? null,
          priceSale: p.priceSale ?? null,
          priceOriginal: p.priceOriginal ?? null,
        })),
      });
    } catch (err) {
      console.error("[analytics/store]", err);
      return res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // ─── ANALYTICS (admin-only) ──────────────────────────────────────────────

  // GET /admin/analytics/summary – persistent DB-backed stats + live memory overlay
  // ?since=2025-01-01  (optional ISO date string)
  router.get("/admin/analytics/summary", authAdmin, async (req, res) => {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const until = req.query.until ? new Date(req.query.until as string) : undefined;
      const [dbStats, liveStats] = await Promise.all([
        getDbSummary(since, until),
        Promise.resolve(getSessionSummary()),
      ]);
      const isFull = !since && !until;
      res.json({
        total_events_db: dbStats.total_events_db,
        total_events_cached: isFull ? liveStats.total_events_cached : 0,
        total_events: isFull
          ? Math.max(dbStats.total_events_db, liveStats.total_events_cached)
          : dbStats.total_events_db,
        unique_sessions: isFull
          ? Math.max(dbStats.unique_sessions, liveStats.unique_sessions)
          : dbStats.unique_sessions,
        top_paths: dbStats.top_paths,
        by_event_type: dbStats.by_event_type,
        recent_searches: dbStats.recent_searches,
      });
    } catch (err) {
      console.error("[analytics/summary] DB error, falling back to memory", err);
      res.json({ ...getSessionSummary(), total_events: getSessionSummary().total_events_cached });
    }
  });

  // GET /admin/analytics/events – recent events from in-memory cache
  router.get("/admin/analytics/events", authAdmin, (req, res) => {
    const limit = Math.min(500, parseInt(req.query.limit as string) || 100);
    res.json(getAllEvents(limit));
  });

  // GET /admin/analytics/session/:id – events for one session (cache)
  router.get(
    "/admin/analytics/session/:id",
    authAdmin,
    (req: Request, res) => {
      res.json(getEventsBySession(req.params.id));
    },
  );

  // GET /admin/analytics/db – database-backed query (full history)
  // ?limit=200&event_type=search&since=2025-01-01
  router.get("/admin/analytics/db", authAdmin, async (req, res) => {
    try {
      const limit = Math.min(1000, parseInt(req.query.limit as string) || 200);
      const event_type = req.query.event_type as EventType | undefined;
      const since = req.query.since
        ? new Date(req.query.since as string)
        : undefined;
      const rows = await queryAnalytics({ limit, event_type, since });
      res.json(rows);
    } catch (err) {
      console.error("analytics/db error", err);
      res.status(500).json({ message: "Villa kom upp við DB fyrirspurn" });
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
