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

// --- Express req.user typing (til að TS kvartið ekki) ---
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

const lastViewCache: Record<string, number> = {};
const VIEW_DEDUP_WINDOW_MS = 5_000;

const TRIAL_DAYS = 7;
const TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;

const PLAN_LIMITS: Record<string, number> = {
  basic: 3,
  pro: 10,
  premium: 20,
};

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

function isTrialExpired(store: any) {
  if (!store) return true;
  if (store.billingStatus === "active") return false;
  if (!store.trialEndsAt) return false;

  const ts = new Date(store.trialEndsAt).getTime();
  if (!Number.isFinite(ts)) return false;

  return Date.now() > ts;
}

async function requireActiveOrTrialStore(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
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

    if ((store as any).isBanned) {
      return res.status(403).json({
        message:
          "Þessi verslun hefur verið bönnuð af kerfisstjóra. Hafðu samband við ÚtsalApp ef þetta er villa.",
      });
    }

    // Setja trialEndsAt ef vantar (mjúk sjálfvirk uppsetning)
    if (!store.trialEndsAt && (store as any).billingStatus !== "expired") {
      const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
      const updated = await storage.updateStore(store.id, {
        trialEndsAt,
        billingStatus: (store as any).billingStatus ?? "trial",
      } as any);
      if (updated) store = updated as any;
    }

    if (isTrialExpired(store)) {
      if ((store as any).billingStatus !== "expired") {
        await storage.updateStore(store.id, {
          billingStatus: "expired",
        } as any);
      }
      return res.status(403).json({
        message:
          "Fríviku þinni er lokið. Virkjaðu áskrift til að halda áfram að setja inn tilboð.",
      });
    }

    next();
  } catch (err) {
    console.error("requireActiveOrTrialStore error", err);
    res.status(500).json({ message: "Villa kom upp" });
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
    images: p.imageUrl ? [{ url: p.imageUrl, alt: p.title }] : [],
    startsAt: p.startsAt ?? null,
    endsAt: p.endsAt ?? null,
    buyUrl: p.buyUrl ?? null,
    viewCount: p.viewCount ?? 0,
    store: store
      ? {
          id: (store as any).id,
          name: (store as any).name,
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
          plan,
          planType: plan, // fyrir eldri client
          billingStatus,
          createdAt: (store as any).createdAt ?? null,
          isBanned: (store as any).isBanned ?? false,
          categories: (store as any).categories ?? [],
          subcategories: (store as any).subcategories ?? [],
        }
      : null,
  };
}

function getPlanRankForPost(post: any, storesById: Record<string, any>) {
  const store = post.storeId ? storesById[post.storeId] : null;
  const plan = store?.plan ?? store?.planType;
  if (plan === "premium") return 3;
  if (plan === "pro") return 2;
  return 1;
}

export function registerRoutes(app: express.Express) {
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(UPLOAD_DIR));

  // -------------------------
  // AUTH / REGISTER
  // -------------------------
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

      const existing = await storage.findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Netfang er þegar í notkun" });
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
        isBanned: false,
        categories: [],
        subcategories: [],
      } as any);

      const user = await storage.createUser({
        email,
        passwordHash,
        role: "store",
        storeId: (store as any).id,
      } as any);

      const billingActive = true;

      return res.json({
        message: "Verslun skráð",
        user: {
          id: (user as any).id,
          email: (user as any).email,
          role: (user as any).role,
        },
        store: {
          id: (store as any).id,
          name: (store as any).name,
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
          plan: (store as any).plan ?? "basic",
          planType: (store as any).plan ?? "basic",
          trialEndsAt: (store as any).trialEndsAt ?? null,
          billingStatus: (store as any).billingStatus ?? "trial",
          billingActive,
          createdAt: (store as any).createdAt ?? null,
          isBanned: (store as any).isBanned ?? false,
          categories: (store as any).categories ?? [],
          subcategories: (store as any).subcategories ?? [],
        },
      });
    } catch (err) {
      console.error("register-store error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // alias
  app.post("/api/v1/stores/register", async (req, res) => {
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

      const existing = await storage.findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Netfang er þegar í notkun" });
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
        isBanned: false,
        categories: [],
        subcategories: [],
      } as any);

      const user = await storage.createUser({
        email,
        passwordHash,
        role: "store",
        storeId: (store as any).id,
      } as any);

      const billingActive = true;

      return res.json({
        message: "Verslun skráð",
        user: {
          id: (user as any).id,
          email: (user as any).email,
          role: (user as any).role,
        },
        store: {
          id: (store as any).id,
          name: (store as any).name,
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
          plan: (store as any).plan ?? "basic",
          planType: (store as any).plan ?? "basic",
          trialEndsAt: (store as any).trialEndsAt ?? null,
          billingStatus: (store as any).billingStatus ?? "trial",
          billingActive,
          createdAt: (store as any).createdAt ?? null,
          isBanned: (store as any).isBanned ?? false,
          categories: (store as any).categories ?? [],
          subcategories: (store as any).subcategories ?? [],
        },
      });
    } catch (err) {
      console.error("stores/register alias error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // -------------------------
  // LOGIN
  // -------------------------
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

      let store = (user as any).storeId
        ? await storage.getStoreById((user as any).storeId)
        : null;

      if (
        store &&
        !(store as any).trialEndsAt &&
        (store as any).billingStatus !== "expired"
      ) {
        const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
        const updated = await storage.updateStore((store as any).id, {
          trialEndsAt,
          billingStatus: (store as any).billingStatus ?? "trial",
        } as any);
        if (updated) store = updated as any;
      }

      const effectiveRole = (user as any).role ?? "store";

      const token = jwt.sign(
        {
          id: (user as any).id,
          email,
          role: effectiveRole,
          storeId: (user as any).storeId,
        },
        JWT_SECRET,
        { expiresIn: "7d" },
      );

      let storePayload: any = null;
      if (store) {
        const plan = (store as any).plan ?? (store as any).planType ?? "basic";
        const billingStatus =
          (store as any).billingStatus ??
          ((store as any).billingActive ? "active" : "trial");
        const billingActive =
          billingStatus === "active" || billingStatus === "trial";

        storePayload = {
          id: (store as any).id,
          name: (store as any).name,
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
          plan,
          planType: plan,
          trialEndsAt: (store as any).trialEndsAt ?? null,
          billingStatus,
          billingActive,
          createdAt: (store as any).createdAt ?? null,
          isBanned: (store as any).isBanned ?? false,
          categories: (store as any).categories ?? [],
          subcategories: (store as any).subcategories ?? [],
        };
      }

      return res.json({
        user: { id: (user as any).id, email, role: effectiveRole },
        store: storePayload,
        token,
      });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // -------------------------
  // AUTH ME
  // -------------------------
  app.get("/api/v1/auth/me", auth(), async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Ekki innskráður" });
      }

      let store = req.user.storeId
        ? await storage.getStoreById(req.user.storeId)
        : null;

      if (
        store &&
        !(store as any).trialEndsAt &&
        (store as any).billingStatus !== "expired"
      ) {
        const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
        const updated = await storage.updateStore((store as any).id, {
          trialEndsAt,
          billingStatus: (store as any).billingStatus ?? "trial",
        } as any);
        if (updated) store = updated as any;
      }

      let storePayload: any = null;
      if (store) {
        const plan = (store as any).plan ?? (store as any).planType ?? "basic";
        const billingStatus =
          (store as any).billingStatus ??
          ((store as any).billingActive ? "active" : "trial");
        const billingActive =
          billingStatus === "active" || billingStatus === "trial";

        storePayload = {
          id: (store as any).id,
          name: (store as any).name,
          address: (store as any).address ?? "",
          phone: (store as any).phone ?? "",
          website: (store as any).website ?? "",
          plan,
          planType: plan,
          trialEndsAt: (store as any).trialEndsAt ?? null,
          billingStatus,
          billingActive,
          createdAt: (store as any).createdAt ?? null,
          isBanned: (store as any).isBanned ?? false,
          categories: (store as any).categories ?? [],
          subcategories: (store as any).subcategories ?? [],
        };
      }

      return res.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role, // role kemur úr token (sem kemur úr DB)
        },
        store: storePayload,
      });
    } catch (err) {
      console.error("auth/me error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // -------------------------
  // POSTS: list / detail
  // -------------------------
  app.get("/api/v1/posts", async (req, res) => {
    try {
      const q = (req.query.q?.toString().toLowerCase() ?? "").trim();

      const [posts, stores] = await Promise.all([
        storage.listPosts(),
        storage.listStores(),
      ]);

      const storesById: Record<string, any> = {};
      for (const s of stores as any[]) storesById[s.id] = s;

      const filteredByQuery = q
        ? (posts as any[]).filter((p) =>
            (p.title || "").toLowerCase().includes(q),
          )
        : (posts as any[]);

      const filtered = filteredByQuery.filter((p) => {
        const store = p.storeId ? storesById[p.storeId] : null;
        if (store && store.isBanned) return false;
        return true;
      });

      filtered.sort((a, b) => {
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

  app.get("/api/v1/posts/:id", async (req, res) => {
    try {
      const all = await storage.listPosts();
      const post = (all as any[]).find((p) => p.id === req.params.id);

      if (!post) {
        return res.status(404).json({ message: "Tilboð fannst ekki" });
      }

      const storeForPost = post.storeId
        ? await storage.getStoreById(post.storeId)
        : null;
      if (storeForPost && (storeForPost as any).isBanned) {
        return res.status(404).json({ message: "Tilboð fannst ekki" });
      }

      const ipHeader = (req.headers["x-forwarded-for"] as string) || "";
      const clientIp = ipHeader.split(",")[0]?.trim() || req.ip || "unknown_ip";

      // ✅ LAGFÆRT: template-string
      const key = `${clientIp}:${req.params.id}`;

      const now = Date.now();
      const last = lastViewCache[key] ?? 0;

      let effective = post;

      if (now - last > VIEW_DEDUP_WINDOW_MS) {
        const currentCount = post.viewCount ?? 0;
        const updated = await storage.updatePost(post.id, {
          viewCount: currentCount + 1,
        } as any);
        if (updated) effective = updated as any;
        lastViewCache[key] = now;
      }

      const mapped = await mapPostToFrontend(effective);
      res.json(mapped);
    } catch (err) {
      console.error("post detail error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // -------------------------
  // CREATE POST
  // -------------------------
  app.post(
    "/api/v1/posts",
    auth("store"),
    requireActiveOrTrialStore,
    async (req, res) => {
      try {
        const title = req.body?.title;
        const description = req.body?.description;
        const category = req.body?.category;
        const buyUrl = req.body?.buyUrl;
        const images = req.body?.images;

        const priceOriginal =
          req.body?.priceOriginal ?? req.body?.originalPrice ?? null;
        const priceSale =
          req.body?.priceSale ?? req.body?.discountedPrice ?? null;

        const startsAt = req.body?.startsAt ?? req.body?.startDate ?? null;
        const endsAt = req.body?.endsAt ?? req.body?.endDate ?? null;

        if (!title || priceOriginal == null || priceSale == null || !category) {
          return res.status(400).json({ message: "Vantar upplýsingar" });
        }

        if (!req.user?.storeId) {
          return res
            .status(400)
            .json({ message: "Engin tengd verslun fannst fyrir notanda" });
        }

        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }

        const rawPlan = (store as any).plan ?? "basic";
        const planKey = String(rawPlan).toLowerCase();

        const maxPosts = PLAN_LIMITS[planKey] ?? PLAN_LIMITS["basic"];

        const storePosts = await storage.getPostsByStore(req.user.storeId);

        const now = Date.now();
        const activePosts = (storePosts as any[]).filter((p) => {
          if (!p.endsAt) return true;
          const endTs = new Date(p.endsAt).getTime();
          if (!Number.isFinite(endTs)) return true;
          return endTs > now;
        });

        if (activePosts.length >= maxPosts) {
          // ✅ LAGFÆRT: template-string
          return res.status(403).json({
            message: `Þú hefur náð hámarksfjölda virkra tilboða (${maxPosts}) fyrir ${planKey} pakkann. Eyðu eldri tilboðum eða uppfærðu í stærri pakka til að bæta við fleiri.`,
          });
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
          storeId: req.user.storeId,
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
    },
  );

  // -------------------------
  // UPDATE / DELETE POST
  // -------------------------
  app.put("/api/v1/posts/:id", auth("store"), async (req, res) => {
    try {
      const postId = req.params.id;

      const all = await storage.listPosts();
      const existing = (all as any[]).find((p) => p.id === postId);

      if (!existing)
        return res.status(404).json({ message: "Færsla fannst ekki" });
      if (existing.storeId !== req.user?.storeId)
        return res.status(403).json({ message: "Ekki heimild" });

      const title = req.body?.title;
      const description = req.body?.description;
      const category = req.body?.category;
      const buyUrl = req.body?.buyUrl;
      const images = req.body?.images;

      const priceOriginal =
        req.body?.priceOriginal ?? req.body?.originalPrice ?? undefined;
      const priceSale =
        req.body?.priceSale ?? req.body?.discountedPrice ?? undefined;

      const startsAt = req.body?.startsAt ?? req.body?.startDate ?? undefined;
      const endsAt = req.body?.endsAt ?? req.body?.endDate ?? undefined;

      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (category !== undefined) updates.category = category;
      if (priceOriginal !== undefined) updates.oldPrice = Number(priceOriginal);
      if (priceSale !== undefined) updates.price = Number(priceSale);
      if (buyUrl !== undefined) updates.buyUrl = buyUrl || null;
      if (startsAt !== undefined) updates.startsAt = startsAt || null;
      if (endsAt !== undefined) updates.endsAt = endsAt || null;
      if (Array.isArray(images) && images.length > 0 && images[0].url)
        updates.imageUrl = images[0].url;

      const updated = await storage.updatePost(postId, updates);
      if (!updated)
        return res.status(500).json({ message: "Tókst ekki að uppfæra" });

      const mapped = await mapPostToFrontend(updated);
      res.json(mapped);
    } catch (err) {
      console.error("update post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.delete("/api/v1/posts/:id", auth("store"), async (req, res) => {
    try {
      const postId = req.params.id;

      const all = await storage.listPosts();
      const target = (all as any[]).find((p) => p.id === postId);

      if (!target)
        return res.status(404).json({ message: "Færsla fannst ekki" });
      if (target.storeId !== req.user?.storeId)
        return res.status(403).json({ message: "Ekki heimild" });

      const deleted = await storage.deletePost(postId);
      res.json({ success: deleted });
    } catch (err) {
      console.error("delete post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // -------------------------
  // ADMIN endpoints (óbreytt í kjarna)
  // -------------------------
  app.delete("/api/v1/admin/posts/:id", auth("admin"), async (req, res) => {
    try {
      const postId = req.params.id;
      const all = await storage.listPosts();
      const target = (all as any[]).find((p) => p.id === postId);
      if (!target)
        return res.status(404).json({ message: "Færsla fannst ekki" });
      const deleted = await storage.deletePost(postId);
      res.json({ success: deleted });
    } catch (err) {
      console.error("admin delete post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.delete("/api/v1/admin/stores/:id", auth("admin"), async (req, res) => {
    try {
      const storeId = req.params.id;
      const deleted = await storage.deleteStore(storeId);
      if (!deleted)
        return res.status(404).json({ message: "Verslun fannst ekki" });
      return res.json({ success: true });
    } catch (err) {
      console.error("admin delete store error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  app.post("/api/v1/admin/stores/:id/ban", auth("admin"), async (req, res) => {
    try {
      const storeId = req.params.id;
      const { isBanned } = req.body;
      const updated = await storage.updateStore(storeId, {
        isBanned: !!isBanned,
      } as any);
      if (!updated)
        return res.status(404).json({ message: "Verslun fannst ekki" });
      return res.json({
        id: (updated as any).id,
        isBanned: (updated as any).isBanned ?? false,
      });
    } catch (err) {
      console.error("admin ban store error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });

  // -------------------------
  // UPLOADS
  // -------------------------
  app.post(
    "/api/v1/uploads",
    auth("store"),
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) return res.status(400).json({ message: "Engin mynd" });

        // ✅ LAGFÆRT: template-string
        const filename = `${crypto.randomUUID()}.jpg`;

        const filepath = path.join(UPLOAD_DIR, filename);

        await sharp(req.file.buffer)
          .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(filepath);

        // ✅ LAGFÆRT: url string
        res.json({ url: `/uploads/${filename}` });
      } catch (err) {
        console.error("upload error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    },
  );

  // -------------------------
  // Serve client in production (óbreytt)
  // -------------------------
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.join(process.cwd(), "client", "dist");

    app.use(express.static(clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/"))
        return next();
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }
}
