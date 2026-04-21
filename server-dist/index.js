// server/index.ts
import express2 from "express";
import { createServer } from "http";
import fs4 from "fs";
import session from "express-session";

// server/routes.ts
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import crypto2 from "crypto";
import path3 from "path";
import fs3 from "fs";

// server/storage-db.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
function resolveDbFile() {
  const prodPath = "/var/data/database.json";
  try {
    const dir = path.dirname(prodPath);
    if (fs.existsSync(dir)) {
      return prodPath;
    }
  } catch {
  }
  return path.join(process.cwd(), "database.json");
}
var DB_FILE = resolveDbFile();
function loadDatabase() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial = { users: [], stores: [], posts: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  return {
    users: raw.users ?? [],
    stores: raw.stores ?? [],
    posts: raw.posts ?? []
  };
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
        s.plan = s.planType ?? "basic";
        changed = true;
      }
      if (s.trialEndsAt === void 0) {
        s.trialEndsAt = null;
        changed = true;
      }
      if (s.billingStatus === void 0) {
        s.billingStatus = s.billingActive === true ? "active" : "trial";
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
    for (const u of this.db.users) {
      if (typeof u.email === "string") {
        const normalized = u.email.trim().toLowerCase();
        if (u.email !== normalized) {
          u.email = normalized;
          changed = true;
        }
      }
      if (u.password !== void 0) {
        delete u.password;
        changed = true;
      }
    }
    if (changed) {
      saveDatabase(this.db);
    }
  }
  // ---------------- USERS ----------------
  async createUser(user) {
    const newUser = {
      ...user,
      email: user.email.trim().toLowerCase(),
      id: crypto.randomUUID()
    };
    this.db.users.push(newUser);
    saveDatabase(this.db);
    return newUser;
  }
  async findUserByEmail(email) {
    const normalized = email.trim().toLowerCase();
    return this.db.users.find(
      (u) => u.email.trim().toLowerCase() === normalized
    );
  }
  async findUserById(id) {
    return this.db.users.find((u) => u.id === id);
  }
  createStore = async (store) => {
    const now = /* @__PURE__ */ new Date();
    const trialDays = 7;
    const accessEndsAt = store.accessEndsAt ?? new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1e3).toISOString();
    const newStore = {
      ...store,
      id: crypto.randomUUID(),
      // existing logic – HALDA
      plan: store.plan ?? "basic",
      billingStatus: store.billingStatus ?? "trial",
      // 👇 NÝI KJARNINN
      accessEndsAt,
      // valfrjálst – til sögulegrar notkunar / UI
      trialEndsAt: store.trialEndsAt ?? accessEndsAt,
      createdAt: now.toISOString()
    };
    this.db.stores.push(newStore);
    saveDatabase(this.db);
    return newStore;
  };
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
    const updated = {
      ...existing,
      ...updates
    };
    if (updated.plan === void 0) updated.plan = "basic";
    if (updated.trialEndsAt === void 0) updated.trialEndsAt = null;
    if (updated.billingStatus === void 0) updated.billingStatus = "trial";
    this.db.stores[index] = updated;
    saveDatabase(this.db);
    return updated;
  }
  // ---------------- POSTS ----------------
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
  async updateUser(userId, updates) {
    const index = this.db.users.findIndex((u) => u.id === userId);
    if (index === -1) return null;
    const updated = { ...this.db.users[index], ...updates };
    this.db.users[index] = updated;
    saveDatabase(this.db);
    return updated;
  }
  async deleteUser(userId) {
    const original = this.db.users.length;
    this.db.users = this.db.users.filter((u) => u.id !== userId);
    const changed = this.db.users.length !== original;
    if (changed) saveDatabase(this.db);
    return changed;
  }
  async deleteStore(storeId) {
    const original = this.db.stores.length;
    this.db.stores = this.db.stores.filter(
      (s) => s.id !== storeId
    );
    const changed = this.db.stores.length !== original;
    if (changed) saveDatabase(this.db);
    return changed;
  }
  async listUsers() {
    return this.db.users;
  }
};
var storage = new DbStorage();

// server/config/uploads.ts
import path2 from "path";
import fs2 from "fs";
function resolveUploadDir() {
  const persistentDir = "/var/data/uploads";
  try {
    const parent = path2.dirname(persistentDir);
    if (fs2.existsSync(parent)) {
      if (!fs2.existsSync(persistentDir)) {
        fs2.mkdirSync(persistentDir, { recursive: true });
      }
      return persistentDir;
    }
  } catch {
  }
  const localDir = path2.join(process.cwd(), "uploads");
  if (!fs2.existsSync(localDir)) {
    fs2.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}
var UPLOAD_DIR = resolveUploadDir();
function toAbsoluteImageUrl(relativeUrl, req) {
  if (!relativeUrl) return null;
  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }
  const host = req.get("host") ?? "localhost:5000";
  const proto = req.get("x-forwarded-proto") ?? req.protocol ?? "https";
  return `${proto}://${host}${relativeUrl.startsWith("/") ? "" : "/"}${relativeUrl}`;
}

// server/session-tracker.ts
import { randomUUID } from "crypto";
import { Pool } from "pg";
var pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 5,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 3e3,
  ssl: process.env.PGHOST !== "localhost" && process.env.PGHOST !== "helium" ? { rejectUnauthorized: false } : false
});
pool.on("error", (err) => {
  console.error("[session-tracker] pg pool error:", err.message);
});
var MAX_CACHE = 1e3;
var cache = [];
function addToCache(event) {
  if (cache.length >= MAX_CACHE) cache.shift();
  cache.push(event);
}
async function persistEvent(event) {
  try {
    await pool.query(
      `INSERT INTO interactions
         (session_id, event_type, target, path, method, timestamp, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        event.session_id,
        event.event_type,
        event.target ?? null,
        event.path,
        event.method,
        event.timestamp,
        event.meta ? JSON.stringify(event.meta) : null
      ]
    );
  } catch (err) {
    console.error("[session-tracker] DB write failed:", err.message);
  }
}
function storeEvent(event) {
  addToCache(event);
  persistEvent(event);
}
var COOKIE_NAME = "utsalapp_sid";
var COOKIE_MAX_AGE_MS = 1e3 * 60 * 60 * 24 * 365;
function parseCookies(header) {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((pair) => pair.trim().split("=")).filter(([k]) => !!k).map(([k, ...v]) => [k.trim(), v.join("=").trim()])
  );
}
function readSessionId(req) {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] ?? null;
}
function writeSessionId(res, sessionId) {
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/"
  });
}
function classifyPath(method, path4, hasQuery = false) {
  if (method === "GET" && /^\/api\/v1\/posts\/[^/]+$/.test(path4))
    return "page_view";
  if (method === "GET" && /\/posts/.test(path4) && hasQuery)
    return "search";
  if (method === "GET" && /\/posts/.test(path4)) return "page_view";
  if (method === "GET" && /\/stores/.test(path4)) return "page_view";
  if (/analyze-search/.test(path4)) return "search";
  if (/^\/api\//.test(path4)) return "api_request";
  return "other";
}
var sessionTracker = (req, res, next) => {
  let sessionId = readSessionId(req);
  if (!sessionId) {
    sessionId = randomUUID();
    writeSessionId(res, sessionId);
  }
  req.sessionId = sessionId;
  const path4 = req.path;
  const skip = path4.startsWith("/uploads/") || path4 === "/health" || !path4.startsWith("/api/");
  if (!skip) {
    const qParam = req.query.q;
    const meta = qParam ? { q: qParam } : void 0;
    storeEvent({
      session_id: sessionId,
      event_type: classifyPath(req.method, path4, !!qParam),
      path: path4,
      method: req.method,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      meta
    });
  }
  next();
};
function logEvent(req, eventType, target, meta) {
  const sessionId = req.sessionId ?? readSessionId(req) ?? "unknown";
  storeEvent({
    session_id: sessionId,
    event_type: eventType,
    target: target ?? null,
    path: req.path,
    method: req.method,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    meta
  });
}
function getAllEvents(limit = 100) {
  return cache.slice(-limit).reverse().map((e, i) => ({
    ...e,
    id: e.id ?? `mem-${Date.now()}-${i}`
  }));
}
function getEventsBySession(sessionId) {
  return cache.filter((e) => e.session_id === sessionId);
}
function getSessionSummary() {
  const bySession = {};
  for (const e of cache) {
    bySession[e.session_id] = (bySession[e.session_id] ?? 0) + 1;
  }
  const counts = {};
  for (const e of cache) counts[e.path] = (counts[e.path] ?? 0) + 1;
  const top_paths = Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 20).map(([path4, count]) => ({ path: path4, count }));
  return {
    total_events_cached: cache.length,
    unique_sessions: Object.keys(bySession).length,
    top_paths
  };
}
async function getDbSummary() {
  const [totalRes, sessionsRes, pathsRes, typesRes, searchesRes] = await Promise.all([
    pool.query("SELECT COUNT(*)::text AS count FROM interactions"),
    pool.query(
      "SELECT COUNT(DISTINCT session_id)::text AS count FROM interactions"
    ),
    pool.query(
      `SELECT path, COUNT(*)::text AS count
           FROM interactions
          GROUP BY path
          ORDER BY count DESC
          LIMIT 20`
    ),
    pool.query(
      `SELECT event_type, COUNT(*)::text AS count
           FROM interactions
          GROUP BY event_type
          ORDER BY count DESC`
    ),
    pool.query(
      `SELECT meta->>'q' AS q, COUNT(*)::text AS count
           FROM interactions
          WHERE event_type = 'search' AND meta->>'q' IS NOT NULL
          GROUP BY meta->>'q'
          ORDER BY count DESC
          LIMIT 20`
    )
  ]);
  return {
    total_events_db: parseInt(totalRes.rows[0]?.count ?? "0"),
    unique_sessions: parseInt(sessionsRes.rows[0]?.count ?? "0"),
    top_paths: pathsRes.rows.map((r) => ({
      path: r.path,
      count: parseInt(r.count)
    })),
    by_event_type: typesRes.rows.map((r) => ({
      event_type: r.event_type,
      count: parseInt(r.count)
    })),
    recent_searches: searchesRes.rows.map((r) => ({
      q: r.q,
      count: parseInt(r.count)
    }))
  };
}
async function queryAnalytics(opts) {
  const conditions = [];
  const values = [];
  let i = 1;
  if (opts?.event_type) {
    conditions.push(`event_type = $${i++}`);
    values.push(opts.event_type);
  }
  if (opts?.since) {
    conditions.push(`timestamp >= $${i++}`);
    values.push(opts.since.toISOString());
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = opts?.limit ?? 500;
  const { rows } = await pool.query(
    `SELECT id, session_id, event_type, target, path, method,
            timestamp, meta
       FROM interactions
       ${where}
       ORDER BY timestamp DESC
       LIMIT $${i}`,
    [...values, limit]
  );
  return rows;
}

// server/search-analyzer.ts
var STOPWORDS = /* @__PURE__ */ new Set([
  "\xE1",
  "\xED",
  "og",
  "e\xF0a",
  "vi\xF0",
  "um",
  "af",
  "til",
  "fr\xE1",
  "me\xF0",
  "\xE1n",
  "sem",
  "er",
  "var",
  "ver\xF0",
  "ver\xF0ur",
  "get",
  "m\xE1",
  "vera",
  "eru",
  "\xFEetta",
  "\xFEessir",
  "\xFEessar",
  "h\xE9r",
  "\xFEar",
  "\xFEegar",
  "hva\xF0",
  "hvar",
  "leit",
  "leita",
  "finna",
  "finn",
  "vil",
  "vil",
  "mig",
  "m\xE9r",
  "m\xE9r",
  "bestu",
  "besta",
  "besti",
  "g\xF3\xF0",
  "gott",
  "g\xF3\xF0ur",
  "st\xF3r",
  "l\xEDtill",
  "billig",
  "\xF3d\xFDr",
  "\xF3d\xFDrt",
  "\xF3d\xFDrir",
  "kaupa",
  "kaup",
  "versla",
  "sko\xF0a",
  "gefa",
  "f\xE1",
  "f\xE6r",
  "f\xE6"
]);
var LOCATIONS = {
  "Reykjav\xEDk": [
    "reykjav\xEDk",
    "reykjavik",
    "rvk",
    "reykjav\xEDkur",
    "reykjav\xEDkurborg",
    "h\xF6fu\xF0borgin",
    "hofudborginn"
  ],
  "K\xF3pavogur": ["k\xF3pavogur", "kopavogur", "k\xF3pavogi", "k\xF3pavogs"],
  "Hafnarfj\xF6r\xF0ur": [
    "hafnarfj\xF6r\xF0ur",
    "hafnarfjordur",
    "hafnarfir\xF0i",
    "hafnarfjar\xF0ar"
  ],
  "Gar\xF0ab\xE6r": ["gar\xF0ab\xE6r", "gardabaer", "gar\xF0ab\xE6", "gar\xF0ab\xE6jar"],
  "Mosfellsb\xE6r": [
    "mosfellsb\xE6r",
    "mosfellsbaer",
    "mosfellsb\xE6",
    "mosfellsb\xE6jar"
  ],
  "Seltjarnarnes": ["seltjarnarnes", "seltjarnarnesi", "selnes"],
  "Akureyri": ["akureyri", "akureyrar", "akureyringar", "akureyrar"],
  "Selfoss": ["selfoss", "selfossi", "selfoss"],
  "Akranes": ["akranes", "akranesi", "akranesb\xE6r"],
  "\xCDsafj\xF6r\xF0ur": ["\xEDsafj\xF6r\xF0ur", "isafjordur", "\xEDsafir\xF0i"],
  "Egilssta\xF0ir": ["egilssta\xF0ir", "egilssta\xF0a", "egilssta\xF0ir"],
  "H\xF6fn": ["h\xF6fn", "hofn", "hafnar"],
  "Vestmannaeyjar": [
    "vestmannaeyjar",
    "vestmannaeyjum",
    "eyjar",
    "hei\xF0m\xF6rk"
  ],
  "Keflav\xEDk": [
    "keflav\xEDk",
    "keflavik",
    "keflav\xEDkur",
    "keflav\xEDkurflugv\xF6llur",
    "reykjanesb\xE6r"
  ],
  "Grindav\xEDk": ["grindav\xEDk", "grindavik", "grindav\xEDkur"],
  "Borgarnes": ["borgarnes", "borgarnesi"],
  "H\xFAsav\xEDk": ["h\xFAsav\xEDk", "husavik", "h\xFAsav\xEDkur"],
  "Dalv\xEDk": ["dalv\xEDk", "dalvik", "dalv\xEDkur"],
  "Siglufj\xF6r\xF0ur": ["siglufj\xF6r\xF0ur", "siglufjordur", "siglfir\xF0i"],
  "\xD3lafsv\xEDk": ["\xF3lafsv\xEDk", "olafsv\xEDk"],
  "Stykkish\xF3lmur": ["stykkish\xF3lmur", "stykkisholmur"],
  "Laugardalur": ["laugardalur", "laugardal", "laugardalnum"],
  "Brei\xF0holt": ["brei\xF0holt", "breidholt", "brei\xF0holti"],
  "Grafarvogur": ["grafarvogur", "grafarvogi"],
  "Hl\xED\xF0ar": ["hl\xED\xF0ar", "hl\xED\xF0um"],
  "Mi\xF0borg": ["mi\xF0borg", "mi\xF0borgin", "midborg", "mi\xF0b\xE6", "mi\xF0b\xE6r"],
  "\xC1rborg": ["\xE1rborg", "arborg", "selfossi"],
  "Su\xF0urnes": ["su\xF0urnes", "sudurnes", "su\xF0urnesjum"],
  "Fjar\xF0abygg\xF0": ["fjar\xF0abygg\xF0", "fjar\xF0abygg\xF0ar"]
};
var locationIndex = /* @__PURE__ */ new Map();
for (const [canonical, forms] of Object.entries(LOCATIONS)) {
  for (const form of forms) {
    locationIndex.set(form.toLowerCase(), canonical);
  }
}
var CATEGORY_RULES = [
  {
    canonical: "Fatna\xF0ur - Konur",
    stems: ["kvenna", "kven", "d\xF6mur", "dam", "konur", "konu"],
    exact: ["dame", "d\xF6mum"]
  },
  {
    canonical: "Fatna\xF0ur - Karlar",
    stems: ["karla", "herr", "herra", "karl"],
    exact: ["karlar", "karlmanns"]
  },
  {
    canonical: "Fatna\xF0ur - B\xF6rn",
    stems: ["barn", "barna", "b\xF6rn", "krakk", "leiksk\xF3l"],
    exact: ["krakkar", "b\xF6rnin"]
  },
  {
    canonical: "Fatna\xF0ur",
    stems: [
      "fatna\xF0u",
      "fatna\xF0",
      "f\xF6t",
      "fata",
      "sk\xF3r",
      "sk\xF3a",
      "sk\xF3",
      "jakk",
      "peys",
      "bux",
      "kj\xF3l",
      "bl\xFAs",
      "shirt",
      "tr\xF6nn",
      "stutterm",
      "\xFAlp",
      "st\xEDgv\xE9l",
      "sandal",
      "hanska"
    ],
    exact: ["f\xF6t", "kl\xE6\xF0i", "kl\xE6\xF0na\xF0ur"]
  },
  {
    canonical: "H\xFAsg\xF6gn",
    stems: [
      "h\xFAsg\xF6gn",
      "h\xFAsgagna",
      "h\xFAsb\xFAn",
      "s\xF3f",
      "bor\xF0",
      "st\xF3l",
      "r\xFAm",
      "sk\xE1p",
      "hillur",
      "hill",
      "lamp",
      "glugga",
      "gard\xEDn",
      "teppi",
      "matsal",
      "eldh\xFAs",
      "svefn"
    ],
    exact: ["h\xFAsg\xF6gn", "st\xF3lar", "bor\xF0in"]
  },
  {
    canonical: "Raft\xE6ki",
    stems: [
      "raft\xE6k",
      "rafmagna",
      "rafmagns",
      "t\xF6lv",
      "fars\xEDm",
      "s\xEDm",
      "spjaldt\xF6lv",
      "\xFEvottav\xE9l",
      "upp\xFEvottav\xE9l",
      "k\xE6l",
      "ofn",
      "leikt\xF6lv",
      "sj\xF3nvarp",
      "sj\xF3n",
      "hlj\xF3\xF0",
      "hlj\xF3\xF0nema",
      "\xFEurrkara",
      "\xEDssk\xE1p",
      "\xEDsbakk",
      "stereo",
      "headphone"
    ],
    exact: ["tv", "pc", "mac", "ipad", "iphone", "android"]
  },
  {
    canonical: "Matv\xF6rur",
    stems: [
      "matv\xF6r",
      "matarv",
      "matur",
      "matar",
      "drykkj",
      "drykkur",
      "kaffi",
      "te ",
      "brau\xF0",
      "mj\xF3lk",
      "ost",
      "kj\xF6t",
      "fisk",
      "gr\xE6nmet",
      "\xE1v\xF6xt",
      "s\xFAkk",
      "cand\xED",
      "nammi",
      "go\xF0",
      "safi",
      "v\xEDn",
      "bj\xF3r",
      "\xE1feng"
    ],
    exact: ["matur", "gr\xE6nmeti", "\xE1vextir", "drykkur"]
  },
  {
    canonical: "Heilsa og \xFAtlit",
    stems: [
      "heilsa",
      "lyfj",
      "v\xEDtam\xEDn",
      "f\xE6\xF0ub\xF3t",
      "skinn",
      "h\xFA\xF0r",
      "snyrtiv\xF6r",
      "snyrti",
      "parfem",
      "ilmvatn",
      "makeupp",
      "make\xFApp",
      "h\xE1rs",
      "h\xE1rgrei\xF0sl",
      "nagla",
      "gels",
      "krem",
      "l\xEDkamsr\xE6kt",
      "l\xEDkams"
    ],
    exact: ["lyfjar", "serum", "spf"]
  },
  {
    canonical: "\xCD\xFEr\xF3ttav\xF6rur",
    stems: [
      "\xED\xFEr\xF3tt",
      "l\xEDkamsr\xE6kt",
      "\xFEj\xE1lfun",
      "r\xE6kt",
      "hj\xF3l",
      "sund",
      "golf",
      "f\xF3tbol",
      "k\xF6rfubol",
      "handbol",
      "tennis",
      "badminton",
      "yoga",
      "j\xF3ga",
      "\xFAtivist",
      "fjallg\xF6ng",
      "j\xF6kulg",
      "sk\xED\xF0",
      "snj\xF3brett",
      "skri\xF0sk\xF3"
    ],
    exact: ["fit", "gym", "sport"]
  },
  {
    canonical: "Leikf\xF6ng & b\xF6rn",
    stems: [
      "leikfang",
      "leikf\xF6n",
      "leik",
      "b\xF6rn",
      "barnav",
      "krakk",
      "p\xFAsl",
      "mynd",
      "b\xF3k",
      "kynning",
      "barnavagn"
    ],
    exact: ["lego", "barbie", "gaming"]
  },
  {
    canonical: "B\xEDlar & akstur",
    stems: [
      "b\xEDl",
      "bifr",
      "bifrei\xF0a",
      "hj\xF3l",
      "dekk",
      "m\xF3torhj\xF3l",
      "ol\xEDa",
      "varahlut",
      "b\xEDlvarahlut"
    ],
    exact: ["bmw", "toyota", "ford", "tesla", "jeep", "suv"]
  },
  {
    canonical: "Fermingargjafir",
    stems: ["ferminar", "ferminga", "ferming", "konfirm"],
    exact: ["fermingagj\xF6f", "ferming"]
  },
  {
    canonical: "Fermingartilbo\xF0",
    stems: ["fermingartilbo\xF0", "fermingartilb"]
  }
];
function buildCategoryIndex() {
  return CATEGORY_RULES.map((r) => ({
    stems: r.stems,
    exact: new Set((r.exact ?? []).map((e) => e.toLowerCase())),
    canonical: r.canonical
  }));
}
var categoryIndex = buildCategoryIndex();
var DISCOUNT_SIGNALS = /* @__PURE__ */ new Set([
  "tilbo\xF0",
  "tilbo\xF0s",
  "\xFAtsala",
  "\xFAts\xF6lu",
  "afsl\xE1ttur",
  "afsl\xE1tt",
  "afsl\xE6tti",
  "afsl",
  "\xF3d\xFDr",
  "\xF3d\xFDrt",
  "\xF3d\xFDrast",
  "billig",
  "cheap",
  "sparna\xF0ur",
  "spara",
  "spar",
  "l\xE6gra",
  "l\xE6gst",
  "l\xE6gur",
  "l\xE6gast",
  "kr\xF6pp",
  "hagst\xE6\xF0",
  "hagst\xE6tt",
  "ver\xF0l\xE6kkun",
  "l\xE6gra ver\xF0",
  "%",
  "off",
  "sale"
]);
var NEW_SIGNALS = /* @__PURE__ */ new Set([
  "n\xFDtt",
  "n\xFDr",
  "n\xFD",
  "n\xFDjast",
  "n\xFDjustu",
  "n\xFDleg",
  "n\xFDlega",
  "n\xFDkomi\xF0",
  "fresh",
  "brand",
  "n\xFDtt"
]);
var ACCENT_MAP = {
  \u00E1: "a",
  \u00E9: "e",
  \u00ED: "i",
  \u00F3: "o",
  \u00FA: "u",
  \u00FD: "y",
  \u00F0: "d",
  \u00FE: "th",
  \u00E6: "ae",
  \u00F6: "o"
};
function foldAccents(s) {
  return s.replace(/[áéíóúýðþæö]/g, (c) => ACCENT_MAP[c] ?? c);
}
function normalize(raw) {
  return raw.toLowerCase().replace(/[.,!?;:"""''()\[\]{}]/g, " ").replace(/\s+/g, " ").trim();
}
function tokenize(normalized) {
  return normalized.split(" ").map((t) => t.trim()).filter((t) => t.length > 1 && !STOPWORDS.has(t));
}
function matchLocation(token) {
  return locationIndex.get(token) ?? locationIndex.get(foldAccents(token)) ?? null;
}
function matchCategory(token) {
  const folded = foldAccents(token);
  for (const rule of categoryIndex) {
    if (rule.exact.has(token) || rule.exact.has(folded)) return rule.canonical;
    for (const stem of rule.stems) {
      if (token.startsWith(stem) || folded.startsWith(foldAccents(stem))) {
        return rule.canonical;
      }
    }
  }
  return null;
}
var DISCOUNT_SIGNALS_FOLDED = new Set(
  [...DISCOUNT_SIGNALS].map(foldAccents)
);
var NEW_SIGNALS_FOLDED = new Set([...NEW_SIGNALS].map(foldAccents));
function isDiscountSignal(token) {
  return DISCOUNT_SIGNALS.has(token) || DISCOUNT_SIGNALS_FOLDED.has(token) || DISCOUNT_SIGNALS_FOLDED.has(foldAccents(token));
}
function isNewSignal(token) {
  return NEW_SIGNALS.has(token) || NEW_SIGNALS_FOLDED.has(token) || NEW_SIGNALS_FOLDED.has(foldAccents(token));
}
function detectIntent(tokens, raw) {
  const joined = raw.toLowerCase();
  for (const t of tokens) {
    if (isDiscountSignal(t)) return "discount";
    if (isNewSignal(t)) return "new";
  }
  if (joined.includes("%") || joined.includes("afsl")) return "discount";
  return tokens.length <= 1 ? "browse" : "search";
}
function computeConfidence(tokens, matchedCount) {
  if (tokens.length === 0) return 0;
  const base = matchedCount / tokens.length;
  return Math.min(1, parseFloat(base.toFixed(2)));
}
function analyzeQuery(rawQuery) {
  const normalized = normalize(rawQuery);
  const tokens = tokenize(normalized);
  let category = null;
  let location = null;
  let matchedCount = 0;
  const keywords = [];
  for (const token of tokens) {
    const loc = matchLocation(token);
    if (loc && !location) {
      location = loc;
      matchedCount++;
      continue;
    }
    const cat = matchCategory(token);
    if (cat && !category) {
      category = cat;
      matchedCount++;
      continue;
    }
    if (isDiscountSignal(token) || isNewSignal(token)) {
      matchedCount++;
      continue;
    }
    if (!STOPWORDS.has(token)) {
      keywords.push(token);
    }
  }
  const intent = detectIntent(tokens, normalized);
  const confidence = computeConfidence(tokens, matchedCount);
  return {
    category,
    location,
    intent,
    keywords,
    confidence,
    raw_query: rawQuery.trim()
  };
}

// server/routes.ts
var JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
var upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path3.extname(file.originalname) || ".jpg";
      cb(null, `${crypto2.randomUUID()}${ext.toLowerCase()}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB
  }
});
var lastViewCache = {};
var VIEW_DEDUP_WINDOW_MS = 5e3;
var TRIAL_DAYS = 7;
var TRIAL_MS = TRIAL_DAYS * 24 * 60 * 60 * 1e3;
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
function authAdmin(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Ekki innskr\xE1\xF0ur" });
  }
  try {
    const decoded = jwt.verify(header.substring(7), JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ message: "A\xF0eins admin hefur heimild" });
    }
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "\xD3gildur token" });
  }
}
function isTrialExpired(store) {
  if (!store) return true;
  if (store.billingStatus === "active") return false;
  if (!store.trialEndsAt) return false;
  const ts = new Date(store.trialEndsAt).getTime();
  if (!Number.isFinite(ts)) return false;
  return Date.now() > ts;
}
async function requirePlanSelected(req, res, next) {
  try {
    if (!req.user?.storeId) {
      return res.status(401).json({ message: "\xD3heimilt" });
    }
    const store = await storage.getStoreById(req.user.storeId);
    if (!store) {
      return res.status(404).json({ message: "Verslun fannst ekki" });
    }
    const plan = store.plan;
    const allowed = ["basic", "pro", "premium", "unlimited"];
    if (!plan || !allowed.includes(plan)) {
      return res.status(403).json({
        message: "\xDE\xFA \xFEarft a\xF0 velja pakka \xE1\xF0ur en \xFE\xFA getur b\xFAi\xF0 til tilbo\xF0.",
        code: "PLAN_REQUIRED"
      });
    }
    return next();
  } catch (err) {
    console.error("requirePlanSelected error", err);
    return res.status(500).json({ message: "Villa kom upp" });
  }
}
async function mapPostToFrontend(p, req) {
  const store = p.storeId ? await storage.getStoreById(p.storeId) : null;
  const plan = store?.plan ?? store?.planType ?? "basic";
  const billingStatus = store?.billingStatus ?? (store?.billingActive ? "active" : "trial");
  const allUrls = [];
  if (Array.isArray(p.images) && p.images.length > 0) {
    for (const img of p.images) {
      const u = typeof img === "string" ? img : img?.url;
      if (u && typeof u === "string" && u.trim()) {
        const resolved = req ? toAbsoluteImageUrl(u, req) : u;
        if (resolved) allUrls.push(resolved);
      }
    }
  }
  if (allUrls.length === 0 && Array.isArray(p.imageUrls) && p.imageUrls.length > 0) {
    for (const u of p.imageUrls) {
      if (typeof u === "string" && u.trim()) {
        const resolved = req ? toAbsoluteImageUrl(u, req) : u;
        if (resolved) allUrls.push(resolved);
      }
    }
  }
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
      alt: Array.isArray(p.images) && p.images[i]?.alt ? p.images[i].alt : p.title
    })),
    startsAt: p.startsAt ?? null,
    endsAt: p.endsAt ?? null,
    buyUrl: p.buyUrl ?? null,
    viewCount: p.viewCount ?? 0,
    store: store ? {
      id: store.id,
      name: store.name,
      plan,
      planType: plan,
      billingStatus,
      createdAt: store.createdAt ?? null
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
function seededRandom(seed) {
  let s = seed >>> 0;
  return () => {
    s += 1831565813;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffleArr(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function buildDiscoveryFeed(posts, storesById) {
  const seed = Math.floor(Date.now() / (1e3 * 60 * 30));
  const rand = seededRandom(seed);
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 60 * 60 * 1e3;
  const tiers = { 3: [], 2: [], 1: [] };
  for (const p of posts) {
    const r = getPlanRankForPost(p, storesById);
    tiers[r].push(p);
  }
  const result = [];
  for (const rank of [3, 2, 1]) {
    const group = tiers[rank];
    if (!group.length) continue;
    const isNew = (p) => p.createdAt && now - new Date(p.createdAt).getTime() < WEEK_MS;
    const discountPct = (p) => typeof p.priceOriginal === "number" && typeof p.priceSale === "number" && p.priceOriginal > 0 ? (p.priceOriginal - p.priceSale) / p.priceOriginal : 0;
    const newPosts = group.filter(isNew);
    const oldPosts = group.filter((p) => !isNew(p));
    const highDiscount = oldPosts.filter((p) => discountPct(p) >= 0.25);
    const regular = oldPosts.filter((p) => discountPct(p) < 0.25);
    const byCategory = {};
    for (const p of shuffleArr(regular, rand)) {
      const cat = p.category || "other";
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(p);
    }
    const catQueues = Object.values(byCategory);
    const catPicks = [];
    while (catQueues.some((q) => q.length > 0)) {
      for (const q of catQueues) {
        if (q.length) catPicks.push(q.shift());
      }
    }
    const n = group.length;
    const wantNew = Math.round(n * 0.4);
    const wantCat = Math.round(n * 0.3);
    const seen = /* @__PURE__ */ new Set();
    const pick = (arr, max) => {
      const out = [];
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
      wantCat
    );
    const randSlice = pick(
      shuffleArr([...newPosts, ...highDiscount, ...regular], rand),
      n
    );
    const qN = [...newSlice];
    const qC = [...catSlice];
    const qR = [...randSlice];
    const merged = [];
    while (qN.length || qC.length || qR.length) {
      if (qN.length) merged.push(qN.shift());
      if (qC.length) merged.push(qC.shift());
      if (qR.length) merged.push(qR.shift());
      if (qR.length) merged.push(qR.shift());
    }
    const dedupSeen = /* @__PURE__ */ new Set();
    result.push(
      ...merged.filter((p) => {
        if (dedupSeen.has(p.id)) return false;
        dedupSeen.add(p.id);
        return true;
      })
    );
  }
  return result;
}
async function registerRoutes(app) {
  const router = express.Router();
  router.use(cors());
  router.use(express.json());
  router.post("/auth/register-store", async (req, res) => {
    try {
      const {
        storeName,
        email: rawEmail,
        password: rawPassword,
        address,
        phone,
        website
      } = req.body;
      if (!storeName || !rawEmail || !rawPassword) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const email = rawEmail.trim().toLowerCase();
      const password = rawPassword.trim();
      const store = await storage.createStore({
        name: storeName.trim(),
        address: (address ?? "").trim(),
        phone: (phone ?? "").trim(),
        website: (website ?? "").trim(),
        logoUrl: "",
        ownerEmail: email,
        // 🔥 mikilvægt
        plan: "basic",
        billingStatus: "trial",
        accessEndsAt: null,
        trialEndsAt: null
      });
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        passwordHash,
        role: "store",
        storeId: store.id
      });
      const isAdmin = user.isAdmin === true;
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          storeId: store.id,
          isAdmin
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      try {
        req.session.user = {
          id: user.id,
          role: "store",
          storeId: store.id
        };
        await new Promise((resolve, reject) => {
          req.session.save((err) => err ? reject(err) : resolve());
        });
      } catch {
      }
      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          isAdmin
        },
        store: {
          id: store.id,
          name: store.name,
          plan: store.plan ?? "basic",
          billingStatus: store.billingStatus ?? "trial",
          address: store.address ?? "",
          phone: store.phone ?? "",
          website: store.website ?? ""
        },
        token
      });
    } catch (err) {
      console.error("[auth/register-store] error:", err);
      return res.status(500).json({ error: "Failed to register store" });
    }
  });
  router.post("/auth/login", async (req, res) => {
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
      let passwordOk = false;
      const storedHash = user.passwordHash || user.password || null;
      if (storedHash && storedHash.startsWith("$2")) {
        passwordOk = await bcrypt.compare(password, storedHash);
      }
      if (!passwordOk && user.password === password) {
        passwordOk = true;
        const newHash = await bcrypt.hash(password, 8);
        await storage.updateUser(user.id, {
          passwordHash: newHash
        });
      }
      if (!passwordOk) {
        return res.status(401).json({ message: "Rangt netfang e\xF0a lykilor\xF0" });
      }
      let store = user.storeId ? await storage.getStoreById(user.storeId) : null;
      if (store && !store.trialEndsAt && store.billingStatus !== "expired") {
        const trialEndsAt = new Date(Date.now() + TRIAL_MS).toISOString();
        const updated = await storage.updateStore(store.id, {
          trialEndsAt,
          billingStatus: store.billingStatus ?? "trial"
        });
        if (updated) store = updated;
      }
      const isAdmin = user.isAdmin === true;
      const token = jwt.sign(
        {
          id: user.id,
          email,
          role: user.role,
          storeId: user.storeId,
          isAdmin
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      return res.json({
        user: {
          id: user.id,
          email,
          role: user.role,
          isAdmin
        },
        store,
        token
      });
    } catch (err) {
      console.error("LOGIN ERROR:", err);
      return res.status(500).json({ message: "Villa vi\xF0 innskr\xE1ningu" });
    }
  });
  router.get(
    "/stores/me/billing",
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
          createdAt: store.createdAt ?? null
        });
      } catch (err) {
        console.error("stores/me/billing error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  router.post(
    "/stores/activate-plan",
    auth("store"),
    async (req, res) => {
      try {
        const bodyPlan = req.body.plan ?? req.body.planType;
        const allowed = ["basic", "pro", "premium", "unlimited"];
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
        let trialEndsAt = store.trialEndsAt ?? null;
        if (!existingTrialEnds) {
          trialEndsAt = new Date(now + TRIAL_MS).toISOString();
        }
        const updated = await storage.updateStore(store.id, {
          plan: bodyPlan,
          trialEndsAt,
          billingStatus: store.billingStatus ?? "trial"
        });
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
          createdAt: updated.createdAt ?? null
          // BÆTT VIÐ
        });
      } catch (err) {
        console.error("activate-plan error:", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  router.post(
    "/stores/me/extend-trial",
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
        const EXTEND_MS = 7 * 24 * 60 * 60 * 1e3;
        const now = Date.now();
        const currentTrialEnds = store.trialEndsAt ? new Date(store.trialEndsAt).getTime() : 0;
        const baseTime = currentTrialEnds > now ? currentTrialEnds : now;
        const newTrialEndsAt = new Date(baseTime + EXTEND_MS).toISOString();
        const updated = await storage.updateStore(store.id, {
          trialEndsAt: newTrialEndsAt,
          billingStatus: "trial"
        });
        if (!updated) {
          return res.status(500).json({ message: "T\xF3kst ekki a\xF0 framlengja a\xF0gang" });
        }
        const plan = updated.plan ?? updated.planType ?? "basic";
        const billingStatus = updated.billingStatus ?? "trial";
        const trialEndsAt = updated.trialEndsAt ?? null;
        let daysLeft = null;
        if (trialEndsAt) {
          const endMs = new Date(trialEndsAt).getTime();
          if (Number.isFinite(endMs)) {
            daysLeft = Math.ceil((endMs - Date.now()) / (24 * 60 * 60 * 1e3));
          }
        }
        return res.json({
          plan,
          trialEndsAt,
          billingStatus,
          trialExpired: false,
          daysLeft,
          createdAt: updated.createdAt ?? null
        });
      } catch (err) {
        console.error("extend-trial error:", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  router.post(
    "/stores/me/logo",
    auth("store"),
    upload.single("logo"),
    async (req, res) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        if (!req.file) {
          return res.status(400).json({ message: "Engin mynd m\xF3ttekin" });
        }
        const relativePath = `/uploads/${req.file.filename}`;
        const absoluteUrl = toAbsoluteImageUrl(relativePath, req);
        await storage.updateStore(req.user.storeId, { logoUrl: absoluteUrl });
        return res.json({ logoUrl: absoluteUrl });
      } catch (err) {
        console.error("upload logo error:", err);
        return res.status(500).json({ message: "Myndaupphle\xF0sla mist\xF3kst" });
      }
    }
  );
  router.post(
    "/stores/me/update-info",
    auth("store"),
    async (req, res) => {
      try {
        if (!req.user?.storeId) {
          return res.status(400).json({ message: "Engin tengd verslun fannst" });
        }
        const { name, address, phone, website } = req.body;
        const updates = {};
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
          id: updated.id,
          name: updated.name,
          address: updated.address ?? "",
          phone: updated.phone ?? "",
          website: updated.website ?? "",
          logoUrl: updated.logoUrl ?? ""
        });
      } catch (err) {
        console.error("update-info error:", err);
        return res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  router.post(
    "/stores/change-password",
    auth("store"),
    async (req, res) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ message: "Ekki innskr\xE1\xF0ur" });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
          return res.status(400).json({ message: "Vantar n\xFAverandi og n\xFDtt lykilor\xF0" });
        }
        if (newPassword.length < 8) {
          return res.status(400).json({ message: "N\xFDtt lykilor\xF0 \xFEarf a\xF0 vera a.m.k. 8 stafir" });
        }
        const user = await storage.findUserById(userId);
        if (!user) {
          return res.status(404).json({ message: "Notandi fannst ekki" });
        }
        const valid = await bcrypt.compare(
          currentPassword,
          user.passwordHash
        );
        if (!valid) {
          return res.status(403).json({ message: "N\xFAverandi lykilor\xF0 er rangt" });
        }
        const newHash = await bcrypt.hash(newPassword, 10);
        await storage.updateUser(userId, { passwordHash: newHash });
        res.json({ success: true, message: "Lykilor\xF0 uppf\xE6rt" });
      } catch (err) {
        console.error("change-password error:", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  router.get("/stores", async (_req, res) => {
    try {
      const stores = await storage.listStores();
      res.json(stores);
    } catch (err) {
      console.error("stores list error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.get("/stores/:id", async (req, res) => {
    try {
      const store = await storage.getStoreById(req.params.id);
      if (!store) {
        return res.status(404).json({ message: "Verslun fannst ekki" });
      }
      res.json({
        id: store.id,
        name: store.name,
        address: store.address ?? "",
        phone: store.phone ?? "",
        website: store.website ?? "",
        logoUrl: store.logoUrl ?? "",
        createdAt: store.createdAt ?? null
      });
    } catch (err) {
      console.error("get store error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
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
        website: website?.trim() || ""
      });
      return res.status(201).json({
        success: true,
        storeId: store.id,
        email: normalizedEmail
      });
    } catch (err) {
      console.error("[stores/register] error:", err);
      return res.status(500).json({ error: "Failed to register store" });
    }
  });
  router.post(
    "/stores/select-plan",
    auth("store"),
    async (req, res) => {
      try {
        const { plan } = req.body;
        if (!plan || !["basic", "pro", "premium", "unlimited"].includes(plan)) {
          return res.status(400).json({ error: "Invalid plan" });
        }
        if (!req.user?.storeId) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        const updated = await storage.updateStore(req.user.storeId, {
          plan,
          billingStatus: "pending",
          planSelectedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        if (!updated) {
          return res.status(500).json({ error: "Failed to update store" });
        }
        return res.json({
          success: true,
          plan: updated.plan,
          billingStatus: updated.billingStatus
        });
      } catch (err) {
        console.error("[stores/select-plan] error:", err);
        return res.status(500).json({ error: "Server error" });
      }
    }
  );
  router.get("/stores/:storeId/posts", async (req, res) => {
    try {
      const storeId = req.params.storeId;
      const posts = await storage.getPostsByStore(storeId);
      const mapped = await Promise.all(posts.map((p) => mapPostToFrontend(p, req)));
      res.json(mapped);
    } catch (err) {
      console.error("store posts error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.post("/analyze-search", (req, res) => {
    const raw = req.body?.query;
    if (typeof raw !== "string" || !raw.trim()) {
      return res.status(400).json({ message: "Vantar 'query' reit \xED JSON l\xEDkama" });
    }
    const result = analyzeQuery(raw);
    logEvent(req, "search", raw.trim(), {
      q: raw.trim(),
      category: result.category,
      location: result.location,
      intent: result.intent
    });
    return res.json(result);
  });
  router.get("/analyze-search", (req, res) => {
    const raw = req.query.q?.trim();
    if (!raw) {
      return res.status(400).json({ message: "Vantar 'q' f\xE6ribreytu \xED sl\xF3\xF0" });
    }
    return res.json(analyzeQuery(raw));
  });
  router.get("/posts", async (req, res) => {
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
      const filtered = q ? posts.filter((p) => (p.title || "").toLowerCase().includes(q)) : posts;
      let ordered;
      if (q) {
        ordered = [...filtered].sort((a, b) => {
          const pa = getPlanRankForPost(a, storesById);
          const pb = getPlanRankForPost(b, storesById);
          if (pb !== pa) return pb - pa;
          const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bd - ad;
        });
      } else {
        ordered = buildDiscoveryFeed(filtered, storesById);
      }
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 40));
      const total = ordered.length;
      const totalPages = Math.ceil(total / limit);
      const paginated = ordered.slice((page - 1) * limit, page * limit);
      const mapped = await Promise.all(paginated.map((p) => mapPostToFrontend(p, req)));
      res.json({ posts: mapped, total, page, totalPages });
    } catch (err) {
      console.error("list posts error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.get("/posts/:id", async (req, res) => {
    try {
      const all = await storage.listPosts();
      const post = all.find((p) => p.id === req.params.id);
      if (!post) {
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
      const mapped = await mapPostToFrontend(effective, req);
      res.json(mapped);
    } catch (err) {
      console.error("post detail error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.post(
    "/posts",
    auth("store"),
    requirePlanSelected,
    async (req, res) => {
      try {
        const storeId = req.user?.storeId;
        if (!storeId) {
          return res.status(401).json({ message: "Ekki innskr\xE1\xF0 verslun" });
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
        if (!title || priceOriginal == null || priceSale == null || !category) {
          return res.status(400).json({ message: "Vantar uppl\xFDsingar" });
        }
        const imageUrl = Array.isArray(images) && images.length > 0 ? images[0].url : "";
        const imageUrls = Array.isArray(images) ? images.map((img) => img.url).filter((u) => typeof u === "string" && u.trim()) : [];
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
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          viewCount: 0
        });
        const mapped = await mapPostToFrontend(newPost, req);
        return res.json(mapped);
      } catch (err) {
        console.error("create post error", err);
        return res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  router.put(
    "/posts/:id",
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
          updates.imageUrls = images.map((img) => img.url).filter((u) => typeof u === "string" && u.trim());
        }
        const updated = await storage.updatePost(postId, updates);
        if (!updated) {
          return res.status(500).json({ message: "T\xF3kst ekki a\xF0 uppf\xE6ra" });
        }
        const mapped = await mapPostToFrontend(updated, req);
        res.json(mapped);
      } catch (err) {
        console.error("update post error", err);
        res.status(500).json({ message: "Villa kom upp" });
      }
    }
  );
  router.delete(
    "/posts/:id",
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
  router.post(
    "/uploads/image",
    auth("store"),
    upload.single("image"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "Engin mynd m\xF3ttekin" });
        }
        const relativePath = `/uploads/${req.file.filename}`;
        const absoluteUrl = toAbsoluteImageUrl(relativePath, req);
        return res.status(200).json({
          imageUrl: absoluteUrl
        });
      } catch (err) {
        console.error("upload image error", err);
        return res.status(500).json({ message: "Myndaupphle\xF0sla mist\xF3kst" });
      }
    }
  );
  router.get("/admin/posts", authAdmin, async (req, res) => {
    try {
      const posts = await storage.listPosts();
      const stores = await storage.listStores();
      const storeMap = {};
      for (const s of stores) storeMap[s.id] = s;
      const result = posts.map((p) => ({
        id: p.id,
        title: p.title,
        category: p.category ?? null,
        price: p.price ?? p.priceSale ?? 0,
        oldPrice: p.oldPrice ?? p.priceOriginal ?? 0,
        imageUrl: p.imageUrl ?? (Array.isArray(p.images) && p.images[0]?.url ? p.images[0].url : null),
        storeId: p.storeId ?? null,
        storeName: p.storeId ? storeMap[p.storeId]?.name ?? "\xD3\xFEekkt" : "\xD3\xFEekkt",
        createdAt: p.createdAt ?? null
      }));
      res.json(result);
    } catch (err) {
      console.error("admin/posts error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.delete("/admin/posts/:id", authAdmin, async (req, res) => {
    try {
      const deleted = await storage.deletePost(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Augl\xFDsing fannst ekki" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("admin/delete post error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.get("/admin/stores", authAdmin, async (req, res) => {
    try {
      const stores = await storage.listStores();
      const users = await storage.listUsers();
      const result = stores.map((s) => {
        const owner = users.find((u) => u.storeId === s.id);
        return {
          id: s.id,
          name: s.name,
          email: owner?.email ?? s.ownerEmail ?? null,
          userId: owner?.id ?? null,
          plan: s.plan ?? "basic",
          billingStatus: s.billingStatus ?? "trial",
          trialEndsAt: s.trialEndsAt ?? null,
          createdAt: s.createdAt ?? null
        };
      });
      res.json(result);
    } catch (err) {
      console.error("admin/stores error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.delete("/admin/stores/:storeId", authAdmin, async (req, res) => {
    try {
      const { storeId } = req.params;
      const posts = await storage.listPosts();
      for (const p of posts) {
        if (p.storeId === storeId) await storage.deletePost(p.id);
      }
      const users = await storage.listUsers();
      const owner = users.find((u) => u.storeId === storeId);
      if (owner) await storage.deleteUser(owner.id);
      await storage.deleteStore(storeId);
      res.json({ success: true });
    } catch (err) {
      console.error("admin/delete store error", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  router.post("/analytics/ad-event", async (req, res) => {
    try {
      const { postId, eventType, postTitle, storeName } = req.body;
      if (!postId || !eventType || !["impression", "click"].includes(eventType)) {
        return res.status(400).json({ ok: false });
      }
      const sessionId = req.utsalSessionId || req.cookies?.utsalapp_sid || "anon";
      logEvent(req, eventType, postId, { postTitle, storeName });
      return res.json({ ok: true });
    } catch (err) {
      console.error("[ad-event]", err);
      return res.json({ ok: false });
    }
  });
  router.get("/admin/analytics/ads", authAdmin, async (_req, res) => {
    try {
      const { Pool: Pool2 } = await import("pg");
      const pool2 = new Pool2({
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        max: 3,
        ssl: process.env.PGHOST !== "localhost" && process.env.PGHOST !== "helium" ? { rejectUnauthorized: false } : false
      });
      const result = await pool2.query(`
        SELECT
          target                                           AS post_id,
          SUM(CASE WHEN event_type='impression' THEN 1 ELSE 0 END) AS impressions,
          SUM(CASE WHEN event_type='click'      THEN 1 ELSE 0 END) AS clicks,
          MAX(meta->>'postTitle')                          AS post_title,
          MAX(meta->>'storeName')                          AS store_name,
          MIN(timestamp)                                   AS first_seen,
          MAX(timestamp)                                   AS last_seen
        FROM interactions
        WHERE event_type IN ('impression','click') AND target IS NOT NULL
        GROUP BY target
        ORDER BY impressions DESC
        LIMIT 200
      `);
      await pool2.end();
      const rows = result.rows.map((r) => ({
        postId: r.post_id,
        postTitle: r.post_title ?? r.post_id,
        storeName: r.store_name ?? "\u2014",
        impressions: Number(r.impressions) || 0,
        clicks: Number(r.clicks) || 0,
        ctr: r.impressions > 0 ? Math.round(Number(r.clicks) / Number(r.impressions) * 1e3) / 10 : 0,
        firstSeen: r.first_seen,
        lastSeen: r.last_seen
      }));
      return res.json(rows);
    } catch (err) {
      console.error("[analytics/ads]", err);
      return res.status(500).json({ message: "Villa \xED greiningum" });
    }
  });
  router.get("/admin/analytics/summary", authAdmin, async (_req, res) => {
    try {
      const [dbStats, liveStats] = await Promise.all([
        getDbSummary(),
        Promise.resolve(getSessionSummary())
      ]);
      res.json({
        // Totals: prefer DB count (persistent), add live-only events
        total_events_db: dbStats.total_events_db,
        total_events_cached: liveStats.total_events_cached,
        total_events: Math.max(dbStats.total_events_db, liveStats.total_events_cached),
        unique_sessions: Math.max(dbStats.unique_sessions, liveStats.unique_sessions),
        // Top paths: merge DB (historical) + live, de-dup and re-sort
        top_paths: dbStats.top_paths,
        by_event_type: dbStats.by_event_type,
        recent_searches: dbStats.recent_searches
      });
    } catch (err) {
      console.error("[analytics/summary] DB error, falling back to memory", err);
      res.json({ ...getSessionSummary(), total_events: getSessionSummary().total_events_cached });
    }
  });
  router.get("/admin/analytics/events", authAdmin, (req, res) => {
    const limit = Math.min(500, parseInt(req.query.limit) || 100);
    res.json(getAllEvents(limit));
  });
  router.get(
    "/admin/analytics/session/:id",
    authAdmin,
    (req, res) => {
      res.json(getEventsBySession(req.params.id));
    }
  );
  router.get("/admin/analytics/db", authAdmin, async (req, res) => {
    try {
      const limit = Math.min(1e3, parseInt(req.query.limit) || 200);
      const event_type = req.query.event_type;
      const since = req.query.since ? new Date(req.query.since) : void 0;
      const rows = await queryAnalytics({ limit, event_type, since });
      res.json(rows);
    } catch (err) {
      console.error("analytics/db error", err);
      res.status(500).json({ message: "Villa kom upp vi\xF0 DB fyrirspurn" });
    }
  });
  router.post("/promote-admin", async (req, res) => {
    try {
      const { email, secret } = req.body;
      const PROMOTE_SECRET = "UtsalApp2026Admin!";
      if (!secret || secret !== PROMOTE_SECRET) {
        return res.status(403).json({ message: "Rangt leynior\xF0" });
      }
      const targetEmail = (email || "gisli@utsalapp.is").trim().toLowerCase();
      const user = await storage.findUserByEmail(targetEmail);
      if (!user) {
        return res.status(404).json({ message: "Notandi fannst ekki" });
      }
      await storage.updateUser(user.id, { isAdmin: true });
      res.json({ success: true, message: `${targetEmail} er n\xFA admin` });
    } catch (err) {
      console.error("promote-admin error:", err);
      res.status(500).json({ message: "Villa kom upp" });
    }
  });
  app.use("/api/v1", router);
  const clientDistPath = path3.join(process.cwd(), "client", "dist");
  if (fs3.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
        return next();
      }
      return res.sendFile(path3.join(clientDistPath, "index.html"));
    });
  }
}

// server/index.ts
var PORT = Number(process.env.PORT) || 5e3;
function main() {
  process.on("unhandledRejection", (reason) => {
    console.error("[unhandledRejection]", reason);
  });
  process.on("uncaughtException", (err) => {
    console.error("[uncaughtException]", err);
  });
  const app = express2();
  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "utsalapp-dev-session-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: false
        // keep false for now on Replit
      }
    })
  );
  app.use(sessionTracker);
  console.log("[uploads] UPLOAD_DIR =", UPLOAD_DIR);
  try {
    if (fs4.existsSync(UPLOAD_DIR)) {
      console.log(
        "[uploads] files on disk:",
        fs4.readdirSync(UPLOAD_DIR).slice(0, 10)
      );
    } else {
      console.warn("[uploads] directory does NOT exist");
    }
  } catch (err) {
    console.error("[uploads] error reading upload dir", err);
  }
  app.use(
    "/uploads",
    express2.static(UPLOAD_DIR, {
      maxAge: "30d",
      immutable: true
    })
  );
  app.use(express2.json());
  app.use(express2.urlencoded({ extended: true }));
  registerRoutes(app, "/api");
  app.use(
    (err, req, res, _next) => {
      console.error("[API ERROR]", {
        url: req.originalUrl,
        method: req.method,
        message: err?.message,
        code: err?.code,
        name: err?.name
      });
      if (err?.stack) {
        console.error(err.stack);
      }
      res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
    }
  );
  const server = createServer(app);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[express] serving on port ${PORT}`);
  });
}
main();
