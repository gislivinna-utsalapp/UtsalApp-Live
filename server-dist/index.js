// server/index.ts
import express2 from "express";
import { createServer } from "http";

// server/routes.ts
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import sharp from "sharp";
import path2 from "path";
import fs2 from "fs";
import crypto2 from "crypto";

// server/storage-db.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
var DB_FILE = path.join(process.cwd(), "database.json");
function loadDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], stores: [], posts: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  const db = {
    users: raw.users ?? [],
    stores: raw.stores ?? [],
    posts: raw.posts ?? []
  };
  return db;
}
function saveDatabase(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}
var DbStorage = class {
  db;
  constructor() {
    this.db = loadDatabase();
    let changed = false;
    for (const s of this.db.stores) {
      if (s.plan === void 0) {
        if (s.planType !== void 0) {
          s.plan = s.planType;
        } else {
          s.plan = "basic";
        }
        changed = true;
      }
      if (s.trialEndsAt === void 0) {
        s.trialEndsAt = null;
        changed = true;
      }
      if (s.billingStatus === void 0) {
        if (s.billingActive === true) {
          s.billingStatus = "active";
        } else {
          s.billingStatus = "trial";
        }
        changed = true;
      }
      if (s.categories === void 0) {
        s.categories = [];
        changed = true;
      }
      if (s.planType !== void 0) {
        delete s.planType;
        changed = true;
      }
      if (s.billingActive !== void 0) {
        delete s.billingActive;
        changed = true;
      }
    }
    if (changed) {
      saveDatabase(this.db);
    }
  }
  // USERS
  async createUser(user) {
    const newUser = { ...user, id: crypto.randomUUID() };
    this.db.users.push(newUser);
    saveDatabase(this.db);
    return newUser;
  }
  async findUserByEmail(email) {
    return this.db.users.find((u) => u.email === email);
  }
  async findUserById(id) {
    return this.db.users.find((u) => u.id === id);
  }
  async updateUser(userId, updates) {
    const index = this.db.users.findIndex((u) => u.id === userId);
    if (index === -1) return null;
    const existing = this.db.users[index];
    const updated = { ...existing, ...updates };
    this.db.users[index] = updated;
    saveDatabase(this.db);
    return updated;
  }
  // STORES
  async createStore(store) {
    const newStore = {
      ...store,
      id: crypto.randomUUID()
    };
    if (newStore.plan === void 0) newStore.plan = "basic";
    if (newStore.trialEndsAt === void 0) newStore.trialEndsAt = null;
    if (newStore.billingStatus === void 0) newStore.billingStatus = "trial";
    if (newStore.categories === void 0) newStore.categories = [];
    this.db.stores.push(newStore);
    saveDatabase(this.db);
    return newStore;
  }
  async getStoreById(id) {
    return this.db.stores.find((s) => s.id === id);
  }
  async listStores() {
    return this.db.stores;
  }
  async updateStore(storeId, updates) {
    const index = this.db.stores.findIndex((s) => s.id === storeId);
    if (index === -1) return null;
    const existing = this.db.stores[index];
    const updated = { ...existing, ...updates };
    if (updated.plan === void 0) updated.plan = "basic";
    if (updated.trialEndsAt === void 0) updated.trialEndsAt = null;
    if (updated.billingStatus === void 0) {
      updated.billingStatus = "trial";
    }
    if (updated.categories === void 0) {
      updated.categories = existing.categories ?? [];
    }
    this.db.stores[index] = updated;
    saveDatabase(this.db);
    return updated;
  }
  // NÝTT: EYÐA VERSLUN + TENGDUM GÖGNUM (ADMIN)
  async deleteStore(storeId) {
    const originalStores = this.db.stores.length;
    this.db.stores = this.db.stores.filter((s) => s.id !== storeId);
    const originalPosts = this.db.posts.length;
    this.db.posts = this.db.posts.filter((p) => p.storeId !== storeId);
    const originalUsers = this.db.users.length;
    this.db.users = this.db.users.filter(
      (u) => u.storeId !== storeId
    );
    const changed = this.db.stores.length !== originalStores || this.db.posts.length !== originalPosts || this.db.users.length !== originalUsers;
    if (changed) {
      saveDatabase(this.db);
    }
    return this.db.stores.length !== originalStores;
  }
  // POSTS
  async createPost(post) {
    const newPost = { ...post, id: crypto.randomUUID() };
    this.db.posts.push(newPost);
    saveDatabase(this.db);
    return newPost;
  }
  async listPosts() {
    return this.db.posts;
  }
  async getPostsByStore(storeId) {
    return this.db.posts.filter((p) => p.storeId === storeId);
  }
  async getPostById(postId) {
    return this.db.posts.find((p) => p.id === postId);
  }
  async updatePost(postId, updates) {
    const index = this.db.posts.findIndex((p) => p.id === postId);
    if (index === -1) return null;
    const existing = this.db.posts[index];
    const updated = { ...existing, ...updates };
    this.db.posts[index] = updated;
    saveDatabase(this.db);
    return updated;
  }
  async deletePost(postId) {
    const original = this.db.posts.length;
    this.db.posts = this.db.posts.filter((p) => p.id !== postId);
    const changed = this.db.posts.length !== original;
    if (changed) saveDatabase(this.db);
    return changed;
  }
};
var storage = new DbStorage();

// server/routes.ts
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
var ADMIN_EMAIL = "b@b.is".toLowerCase();
var UPLOAD_DIR = path2.join(process.cwd(), "uploads");
if (!fs2.existsSync(UPLOAD_DIR)) {
  fs2.mkdirSync(UPLOAD_DIR, { recursive: true });
}
var lastViewCache = {};
var VIEW_DEDUP_WINDOW_MS = 5e3;
var TRIAL_DAYS = 7;
var TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1e3;
var PLAN_LIMITS = {
  basic: 3,
  pro: 10,
  premium: 20
};
function auth(requiredRole) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Ekki innskr\xE1\xF0ur" });
    }
    try {
      const decoded = jwt.verify(
        header.substring(7),
        JWT_SECRET
      );
      if (decoded?.email && decoded.email.toLowerCase() === ADMIN_EMAIL) {
        decoded.role = "admin";
      }
      req.user = decoded;
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: "Ekki heimild" });
      }
      next();
    } catch {
      return res.status(401).json({ message: "\xD3gildur token" });
    }
  };
}
function isTrialExpired(store) {
  if (!store) return true;
  if (store.billingStatus === "active") return false;
  if (!store.trialEndsAt) return false;
  const ts = new Date(store.trialEndsAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() > ts;
}
async function requireActiveOrTrialStore(req, res, next) {
  try {
    if (!req.user?.storeId) {
      return res.status(400).json({ message: "Engin tengd verslun fannst fyrir notanda" });
    }
    let store = await storage.getStoreById(req.user.storeId);
    if (!store) {
      return res.status(404).json({ message: "Verslun fannst ekki" });
    }
    if (store.isBanned) {
      return res.status(403).json({
        message: "\xDEessi verslun hefur veri\xF0 b\xF6nnu\xF0 af kerfisstj\xF3ra. Haf\xF0u samband vi\xF0 \xDAtsalApp ef \xFEetta er villa."
      });
    }
    if (!store.trialEndsAt && store.billingStatus !== "expired") {
      const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
      const updated = await storage.updateStore(store.id, {
        trialEndsAt,
        billingStatus: store.billingStatus ?? "trial"
      });
      if (updated) {
        store = updated;
      }
    }
    if (isTrialExpired(store)) {
      if (store.billingStatus !== "expired") {
        await storage.updateStore(store.id, {
          billingStatus: "expired"
        });
      }
      return res.status(403).json({
        message: "Fr\xEDviku \xFEinni er loki\xF0. Virkja\xF0u \xE1skrift til a\xF0 halda \xE1fram a\xF0 setja inn tilbo\xF0."
      });
    }
    next();
  } catch (err) {
    console.error("requireActiveOrTrialStore error", err);
    res.status(500).json({ message: "Villa kom upp" });
  }
}
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});
async function mapPostToFrontend(p) {
  const store = p.storeId ? await storage.getStoreById(p.storeId) : null;
  const plan = store?.plan ?? store?.planType ?? "basic";
  const billingStatus = store?.billingStatus ?? (store?.billingActive ? "active" : "trial");
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
    store: store ? {
      id: store.id,
      name: store.name,
      address: store.address ?? "",
      phone: store.phone ?? "",
      website: store.website ?? "",
      plan,
      planType: plan,
      // fyrir eldri client
      billingStatus,
      createdAt: store.createdAt ?? null,
      isBanned: store.isBanned ?? false,
      categories: store.categories ?? [],
      subcategories: store.subcategories ?? []
    } : null
  };
}
function getPlanRankForPost(post, storesById) {
  const store = post.storeId ? storesById[post.storeId] : null;
  const plan = store?.plan ?? store?.planType;
  if (plan === "premium") return 3;
  if (plan === "pro") return 2;
  return 1;
}
function registerRoutes(app) {
  app.use(cors());
  app.use(express.json());
  app.use("/uploads", express.static(UPLOAD_DIR));
  app.post(
    "/api/v1/auth/register-store",
    async (req, res) => {
      try {
        const {
          storeName,
          email: rawEmail,
          password: rawPassword,
          address,
          phone,
          website
        } = req.body;
        const email = (rawEmail ?? "").trim().toLowerCase();
        const password = (rawPassword ?? "").trim();
        if (!storeName || !email || !password) {
          return res.status(400).json({ message: "Vantar uppl\xFDsingar" });
        }
        const existing = await storage.findUserByEmail(email);
        if (existing) {
          return res.status(400).json({ message: "Netfang er \xFEegar \xED notkun" });
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
          subcategories: []
        });
        const user = await storage.createUser({
          email,
          passwordHash,
          role: "store",
          storeId: store.id
        });
        const billingActive = true;
        return res.json({
          message: "Verslun skr\xE1\xF0",
          user: { id: user.id, email: user.email, role: user.role },
          store: {
            id: store.id,
            name: store.name,
            address: store.address ?? "",
            phone: store.phone ?? "",
            website: store.website ?? "",
            plan: store.plan ?? "basic",
            planType: store.plan ?? "basic",
            trialEndsAt: store.trialEndsAt ?? null,
            billingStatus: store.billingStatus ?? "trial",
            billingActive,
            createdAt: store.createdAt ?? null,
            isBanned: store.isBanned ?? false,
            categories: store.categories ?? [],
            subcategories: store.subcategories ?? []
          }
        });
      } catch (err) {
        console.error("register-store error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.post("/api/v1/stores/register", async (req, res) => {
    try {
      const {
        storeName,
        email: rawEmail,
        password: rawPassword,
        address,
        phone,
        website
      } = req.body;
      const email = (rawEmail ?? "").trim().toLowerCase();
      const password = (rawPassword ?? "").trim();
      if (!storeName || !email || !password) {
        return res.status(400).json({ message: "Vantar uppl\xFDsingar" });
      }
      const existing = await storage.findUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Netfang er \xFEegar \xED notkun" });
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
        subcategories: []
      });
      const user = await storage.createUser({
        email,
        passwordHash,
        role: "store",
        storeId: store.id
      });
      const billingActive = true;
      return res.json({
        message: "Verslun skr\xE1\xF0",
        user: { id: user.id, email: user.email, role: user.role },
        store: {
          id: store.id,
          name: store.name,
          address: store.address ?? "",
          phone: store.phone ?? "",
          website: store.website ?? "",
          plan: store.plan ?? "basic",
          planType: store.plan ?? "basic",
          trialEndsAt: store.trialEndsAt ?? null,
          billingStatus: store.billingStatus ?? "trial",
          billingActive,
          createdAt: store.createdAt ?? null,
          isBanned: store.isBanned ?? false,
          categories: store.categories ?? [],
          subcategories: store.subcategories ?? []
        }
      });
    } catch (err) {
      console.error("stores/register alias error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const rawEmail = req.body?.email ?? "";
      const rawPassword = req.body?.password ?? "";
      const email = rawEmail.trim().toLowerCase();
      const password = rawPassword.trim();
      if (!email || !password) {
        return res.status(400).json({ message: "Vantar netfang og lykilor\xF0" });
      }
      const user = await storage.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Rangt netfang e\xF0a lykilor\xF0" });
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        return res.status(401).json({ message: "Rangt netfang e\xF0a lykilor\xF0" });
      }
      let store = user.storeId ? await storage.getStoreById(user.storeId) : null;
      if (store && !store.trialEndsAt && store.billingStatus !== "expired") {
        const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
        const updated = await storage.updateStore(store.id, {
          trialEndsAt,
          billingStatus: store.billingStatus ?? "trial"
        });
        if (updated) {
          store = updated;
        }
      }
      const baseRole = user.role;
      const effectiveRole = email === ADMIN_EMAIL ? "admin" : baseRole;
      const token = jwt.sign(
        {
          id: user.id,
          email,
          role: effectiveRole,
          storeId: user.storeId
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      let storePayload = null;
      if (store) {
        const plan = store.plan ?? store.planType ?? "basic";
        const billingStatus = store.billingStatus ?? (store.billingActive ? "active" : "trial");
        const billingActive = billingStatus === "active" || billingStatus === "trial";
        storePayload = {
          id: store.id,
          name: store.name,
          address: store.address ?? "",
          phone: store.phone ?? "",
          website: store.website ?? "",
          plan,
          planType: plan,
          trialEndsAt: store.trialEndsAt ?? null,
          billingStatus,
          billingActive,
          createdAt: store.createdAt ?? null,
          isBanned: store.isBanned ?? false,
          categories: store.categories ?? [],
          subcategories: store.subcategories ?? []
        };
      }
      return res.json({
        user: { id: user.id, email, role: effectiveRole },
        store: storePayload,
        token
      });
    } catch (err) {
      console.error("login error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  app.get(
    "/api/v1/auth/me",
    auth(),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Ekki innskr\xE1\xF0ur" });
        }
        let store = req.user.storeId ? await storage.getStoreById(req.user.storeId) : null;
        if (store && !store.trialEndsAt && store.billingStatus !== "expired") {
          const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
          const updated = await storage.updateStore(store.id, {
            trialEndsAt,
            billingStatus: store.billingStatus ?? "trial"
          });
          if (updated) {
            store = updated;
          }
        }
        let storePayload = null;
        if (store) {
          const plan = store.plan ?? store.planType ?? "basic";
          const billingStatus = store.billingStatus ?? (store.billingActive ? "active" : "trial");
          const billingActive = billingStatus === "active" || billingStatus === "trial";
          storePayload = {
            id: store.id,
            name: store.name,
            address: store.address ?? "",
            phone: store.phone ?? "",
            website: store.website ?? "",
            plan,
            planType: plan,
            trialEndsAt: store.trialEndsAt ?? null,
            billingStatus,
            billingActive,
            createdAt: store.createdAt ?? null,
            isBanned: store.isBanned ?? false,
            categories: store.categories ?? [],
            subcategories: store.subcategories ?? []
          };
        }
        return res.json({
          user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role
          },
          store: storePayload
        });
      } catch (err) {
        console.error("auth/me error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.post(
    "/api/v1/auth/change-password",
    auth(),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).json({ message: "Ekki innskr\xE1\xF0ur" });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          return res.status(400).json({ message: "Vantar n\xFAverandi og n\xFDtt lykilor\xF0" });
        }
        if (newPassword.trim().length < 6) {
          return res.status(400).json({
            message: "N\xFDtt lykilor\xF0 \xFEarf a\xF0 vera a\xF0 minnsta kosti 6 stafir."
          });
        }
        const user = await storage.findUserById(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "Notandi fannst ekki" });
        }
        const ok = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!ok) {
          return res.status(400).json({ message: "Gamla lykilor\xF0i\xF0 stemmir ekki" });
        }
        const passwordHash = await bcrypt.hash(newPassword.trim(), 10);
        const updated = await storage.updateUser(user.id, {
          passwordHash
        });
        if (!updated) {
          return res.status(500).json({ message: "T\xF3kst ekki a\xF0 uppf\xE6ra lykilor\xF0" });
        }
        return res.json({ success: true });
      } catch (err) {
        console.error("change-password error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.get(
    "/api/v1/stores/me/billing",
    auth("store"),
    async (req, res) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }
        const trialEndsAt = store.trialEndsAt ?? null;
        const billingStatus = store.billingStatus ?? (store.billingActive ? "active" : "trial");
        let daysLeft = null;
        if (trialEndsAt) {
          const endMs = new Date(trialEndsAt).getTime();
          if (Number.isFinite(endMs)) {
            const diff = endMs - Date.now();
            daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1e3));
          }
        }
        const plan = store.plan ?? store.planType ?? "basic";
        return res.json({
          plan,
          trialEndsAt,
          billingStatus,
          trialExpired: isTrialExpired(store),
          daysLeft,
          createdAt: store.createdAt ?? null,
          isBanned: store.isBanned ?? false
        });
      } catch (err) {
        console.error("stores/me/billing error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.put(
    "/api/v1/stores/me",
    auth("store"),
    async (req, res) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }
        const { name, address, phone, website, categories, subcategories } = req.body;
        const updates = {};
        if (name !== void 0) {
          const trimmed = name.trim();
          if (!trimmed) {
            return res.status(400).json({ message: "Nafn verslunar m\xE1 ekki vera t\xF3mt" });
          }
          updates.name = trimmed;
        }
        if (address !== void 0) {
          updates.address = address ? address.trim() : null;
        }
        if (phone !== void 0) {
          updates.phone = phone ? phone.trim() : null;
        }
        if (website !== void 0) {
          updates.website = website ? website.trim() : null;
        }
        if (categories !== void 0) {
          if (!Array.isArray(categories)) {
            return res.status(400).json({ message: "Flokkar \xFEurfa a\xF0 vera fylki af strengjum" });
          }
          const cleaned = categories.map((c) => String(c).trim()).filter(Boolean);
          updates.categories = cleaned.slice(0, 3);
        }
        if (subcategories !== void 0) {
          if (!Array.isArray(subcategories)) {
            return res.status(400).json({
              message: "Undirflokkar \xFEurfa a\xF0 vera fylki af strengjum"
            });
          }
          const cleanedSubs = subcategories.map((s) => String(s).trim()).filter(Boolean);
          updates.subcategories = cleanedSubs;
        }
        const updated = await storage.updateStore(store.id, updates);
        if (!updated) {
          return res.status(500).json({ message: "T\xF3kst ekki a\xF0 uppf\xE6ra verslun" });
        }
        const plan = updated.plan ?? updated.planType ?? "basic";
        const billingStatus = updated.billingStatus ?? (updated.billingActive ? "active" : "trial");
        const billingActive = billingStatus === "active" || billingStatus === "trial";
        return res.json({
          id: updated.id,
          name: updated.name,
          address: updated.address ?? "",
          phone: updated.phone ?? "",
          website: updated.website ?? "",
          plan,
          planType: plan,
          trialEndsAt: updated.trialEndsAt ?? null,
          billingStatus,
          billingActive,
          createdAt: updated.createdAt ?? null,
          isBanned: updated.isBanned ?? false,
          categories: updated.categories ?? [],
          subcategories: updated.subcategories ?? []
        });
      } catch (err) {
        console.error("stores/me update error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.post(
    "/api/v1/stores/activate-plan",
    auth("store"),
    async (req, res) => {
      try {
        const bodyPlan = req.body.plan ?? req.body.planType;
        const allowed = ["basic", "pro", "premium"];
        if (!bodyPlan || !allowed.includes(bodyPlan)) {
          return res.status(400).json({ message: "\xD3gild pakkategund" });
        }
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }
        const now = Date.now();
        const existingTrialEnds = store.trialEndsAt ? new Date(store.trialEndsAt).getTime() : null;
        const trialExpired = isTrialExpired(store);
        const updates = {
          plan: bodyPlan
        };
        if (!existingTrialEnds) {
          updates.trialEndsAt = new Date(now + TRIAL_MS).toISOString();
          updates.billingStatus = "trial";
        } else if (!trialExpired) {
          updates.trialEndsAt = store.trialEndsAt;
          updates.billingStatus = store.billingStatus ?? "trial";
        } else {
          updates.billingStatus = "active";
        }
        const updated = await storage.updateStore(store.id, updates);
        if (!updated) {
          return res.status(500).json({ message: "T\xF3kst ekki a\xF0 uppf\xE6ra pakka" });
        }
        const plan = updated.plan ?? updated.planType ?? "basic";
        const billingStatus = updated.billingStatus ?? (updated.billingActive ? "active" : "trial");
        const billingActive = billingStatus === "active" || billingStatus === "trial";
        return res.json({
          id: updated.id,
          name: updated.name,
          address: updated.address ?? "",
          phone: updated.phone ?? "",
          website: updated.website ?? "",
          plan,
          planType: plan,
          trialEndsAt: updated.trialEndsAt ?? null,
          billingStatus,
          billingActive,
          createdAt: updated.createdAt ?? null,
          isBanned: updated.isBanned ?? false,
          categories: updated.categories ?? [],
          subcategories: updated.subcategories ?? []
        });
      } catch (err) {
        console.error("activate-plan error:", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.get("/api/v1/stores", async (_req, res) => {
    try {
      const stores = await storage.listStores();
      res.json(stores);
    } catch (err) {
      console.error("stores list error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  app.get("/api/v1/stores/:storeId", async (req, res) => {
    try {
      const storeId = req.params.storeId;
      const store = await storage.getStoreById(storeId);
      if (!store) {
        return res.status(404).json({ message: "Verslun fannst ekki" });
      }
      if (store.isBanned) {
        return res.status(404).json({ message: "Verslun fannst ekki" });
      }
      const plan = store.plan ?? store.planType ?? "basic";
      return res.json({
        id: store.id,
        name: store.name,
        address: store.address ?? "",
        phone: store.phone ?? "",
        website: store.website ?? "",
        createdAt: store.createdAt ?? null,
        plan,
        categories: store.categories ?? [],
        subcategories: store.subcategories ?? []
      });
    } catch (err) {
      console.error("store public profile error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  app.get("/api/v1/stores/:storeId/posts", async (req, res) => {
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
  app.get("/api/v1/posts", async (req, res) => {
    try {
      const q = req.query.q?.toLowerCase() || "";
      const [posts, stores] = await Promise.all([
        storage.listPosts(),
        storage.listStores()
      ]);
      const storesById = {};
      for (const s of stores) {
        storesById[s.id] = s;
      }
      const filteredByQuery = q ? posts.filter((p) => (p.title || "").toLowerCase().includes(q)) : posts;
      const filtered = filteredByQuery.filter((p) => {
        const store = p.storeId ? storesById[p.storeId] : null;
        if (store && store.isBanned) return false;
        return true;
      });
      filtered.sort((a, b) => {
        const pa = getPlanRankForPost(a, storesById);
        const pb = getPlanRankForPost(b, storesById);
        if (pb !== pa) {
          return pb - pa;
        }
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
      const post = all.find((p) => p.id === req.params.id);
      if (!post) {
        return res.status(404).json({ message: "Tilbo\xF0 fannst ekki" });
      }
      const storeForPost = post.storeId ? await storage.getStoreById(post.storeId) : null;
      if (storeForPost && storeForPost.isBanned) {
        return res.status(404).json({ message: "Tilbo\xF0 fannst ekki" });
      }
      const ipHeader = req.headers["x-forwarded-for"] || "";
      const clientIp = ipHeader.split(",")[0]?.trim() || req.ip || "unknown_ip";
      const key = `${clientIp}:${req.params.id}`;
      const now = Date.now();
      const last = lastViewCache[key] ?? 0;
      let effective = post;
      if (now - last > VIEW_DEDUP_WINDOW_MS) {
        const currentCount = post.viewCount ?? 0;
        const updated = await storage.updatePost(post.id, {
          viewCount: currentCount + 1
        });
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
  app.post(
    "/api/v1/posts",
    auth("store"),
    requireActiveOrTrialStore,
    async (req, res) => {
      try {
        const {
          title,
          description,
          category,
          priceOriginal,
          priceSale,
          buyUrl,
          startsAt,
          endsAt,
          images
        } = req.body;
        if (!title || priceOriginal == null || priceSale == null || !category) {
          return res.status(400).json({ message: "Vantar uppl\xFDsingar" });
        }
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst fyrir notanda" });
        }
        const store = await storage.getStoreById(req.user.storeId);
        if (!store) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }
        const rawPlan = store.plan ?? store.planType ?? "basic";
        const planKey = String(rawPlan).toLowerCase();
        const maxPosts = PLAN_LIMITS[planKey] ?? PLAN_LIMITS["basic"];
        const storePosts = await storage.getPostsByStore(req.user.storeId);
        const now = Date.now();
        const activePosts = storePosts.filter((p) => {
          if (!p.endsAt) return true;
          const endTs = new Date(p.endsAt).getTime();
          if (!Number.isFinite(endTs)) return true;
          return endTs > now;
        });
        if (activePosts.length >= maxPosts) {
          return res.status(403).json({
            message: `\xDE\xFA hefur n\xE1\xF0 h\xE1marksfj\xF6lda virkra tilbo\xF0a (${maxPosts}) fyrir ${planKey} pakkann. Ey\xF0u eldri tilbo\xF0um e\xF0a uppf\xE6r\xF0u \xED st\xE6rri pakka til a\xF0 b\xE6ta vi\xF0 fleiri.`
          });
        }
        const imageUrl = Array.isArray(images) && images.length > 0 ? images[0].url : "";
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
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          viewCount: 0
        });
        const mapped = await mapPostToFrontend(newPost);
        res.json(mapped);
      } catch (err) {
        console.error("create post error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.put(
    "/api/v1/posts/:id",
    auth("store"),
    async (req, res) => {
      try {
        const postId = req.params.id;
        const all = await storage.listPosts();
        const existing = all.find((p) => p.id === postId);
        if (!existing) {
          return res.status(404).json({ message: "F\xE6rsla fannst ekki" });
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
          images
        } = req.body;
        const updates = {};
        if (title !== void 0) updates.title = title;
        if (description !== void 0) updates.description = description;
        if (category !== void 0) updates.category = category;
        if (priceOriginal !== void 0)
          updates.oldPrice = Number(priceOriginal);
        if (priceSale !== void 0) updates.price = Number(priceSale);
        if (buyUrl !== void 0) updates.buyUrl = buyUrl || null;
        if (startsAt !== void 0) updates.startsAt = startsAt || null;
        if (endsAt !== void 0) updates.endsAt = endsAt || null;
        if (Array.isArray(images) && images.length > 0 && images[0].url) {
          updates.imageUrl = images[0].url;
        }
        const updated = await storage.updatePost(postId, updates);
        if (!updated) {
          return res.status(500).json({ message: "T\xF3kst ekki a\xF0 uppf\xE6ra" });
        }
        const mapped = await mapPostToFrontend(updated);
        res.json(mapped);
      } catch (err) {
        console.error("update post error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.delete(
    "/api/v1/posts/:id",
    auth("store"),
    async (req, res) => {
      try {
        const postId = req.params.id;
        const all = await storage.listPosts();
        const target = all.find((p) => p.id === postId);
        if (!target) {
          return res.status(404).json({ message: "F\xE6rsla fannst ekki" });
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
    }
  );
  app.delete(
    "/api/v1/admin/posts/:id",
    auth(),
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({ message: "Ekki heimild" });
        }
        const postId = req.params.id;
        const all = await storage.listPosts();
        const target = all.find((p) => p.id === postId);
        if (!target) {
          return res.status(404).json({ message: "F\xE6rsla fannst ekki" });
        }
        const deleted = await storage.deletePost(postId);
        res.json({ success: deleted });
      } catch (err) {
        console.error("admin delete post error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.delete(
    "/api/v1/admin/stores/:id",
    auth(),
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({ message: "Ekki heimild" });
        }
        const storeId = req.params.id;
        const deleted = await storage.deleteStore(storeId);
        if (!deleted) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }
        return res.json({ success: true });
      } catch (err) {
        console.error("admin delete store error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.post(
    "/api/v1/admin/stores/:id/ban",
    auth(),
    async (req, res) => {
      try {
        if (!req.user || req.user.role !== "admin") {
          return res.status(403).json({ message: "Ekki heimild" });
        }
        const storeId = req.params.id;
        const { isBanned } = req.body;
        const updated = await storage.updateStore(storeId, {
          isBanned: !!isBanned
        });
        if (!updated) {
          return res.status(404).json({ message: "Verslun fannst ekki" });
        }
        return res.json({
          id: updated.id,
          isBanned: updated.isBanned ?? false
        });
      } catch (err) {
        console.error("admin ban store error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  app.post(
    "/api/v1/uploads",
    auth("store"),
    upload.single("image"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Engin mynd" });
        }
        const filename = `${crypto2.randomUUID()}.jpg`;
        const filepath = path2.join(UPLOAD_DIR, filename);
        await sharp(req.file.buffer).resize(1200, 1200, {
          fit: "inside",
          withoutEnlargement: true
        }).jpeg({ quality: 80 }).toFile(filepath);
        res.json({ url: `/uploads/${filename}` });
      } catch (err) {
        console.error("upload error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path2.join(process.cwd(), "client", "dist");
    app.use(express.static(clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
        return next();
      }
      res.sendFile(path2.join(clientDistPath, "index.html"));
    });
  }
}

// server/index.ts
var PORT = Number(process.env.PORT) || 5e3;
function main() {
  const app = express2();
  registerRoutes(app);
  const server = createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}
main();
