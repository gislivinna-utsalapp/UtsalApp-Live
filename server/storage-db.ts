import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DB_FILE = process.env.DB_FILE ?? path.join(PROJECT_ROOT, "database.json");

console.log("[db] Using database file:", DB_FILE);

type DbUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: "store" | "admin";
  storeId?: string;
};

type DbStore = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string;
  ownerEmail?: string;

  plan?: "basic" | "pro" | "premium";
  trialEndsAt?: string | null;
  billingStatus?: "trial" | "active" | "expired";
  isBanned?: boolean;

  categories?: string[];
  subcategories?: string[];

  // legacy (til að brjóta ekki eldri gögn)
  planType?: any;
  billingActive?: any;

  createdAt?: string | null;
};

type DbPost = {
  id: string;
  title: string;
  description?: string;
  category: string;

  price?: number; // new
  oldPrice?: number; // new
  priceSale?: number; // legacy
  priceOriginal?: number; // legacy

  imageUrl?: string;

  storeId: string;

  buyUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;

  createdAt?: string;
  viewCount?: number;
};

type DatabaseShape = {
  users: DbUser[];
  stores: DbStore[];
  posts: DbPost[];
};

function ensureDbFileExists() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseShape = {
      users: [],
      stores: [],
      posts: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

function loadDatabase(): DatabaseShape {
  ensureDbFileExists();
  const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  return {
    users: raw.users ?? [],
    stores: raw.stores ?? [],
    posts: raw.posts ?? [],
  };
}

function saveDatabase(db: DatabaseShape) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

class DbStorage {
  db: DatabaseShape;

  constructor() {
    this.db = loadDatabase();

    // Mild migration / normalization
    let changed = false;
    for (const s of this.db.stores) {
      if (s.plan === undefined) {
        s.plan = (s.planType as any) ?? "basic";
        changed = true;
      }
      if (s.trialEndsAt === undefined) {
        s.trialEndsAt = null;
        changed = true;
      }
      if (s.billingStatus === undefined) {
        s.billingStatus = s.billingActive === true ? "active" : "trial";
        changed = true;
      }
      if (s.categories === undefined) {
        s.categories = [];
        changed = true;
      }
      if (s.planType !== undefined) {
        delete (s as any).planType;
        changed = true;
      }
      if (s.billingActive !== undefined) {
        delete (s as any).billingActive;
        changed = true;
      }
    }

    if (changed) {
      saveDatabase(this.db);
    }
  }

  // -------------------------
  // USERS
  // -------------------------
  async createUser(user: Omit<DbUser, "id">): Promise<DbUser> {
    const newUser: DbUser = {
      ...user,
      id: crypto.randomUUID(),
    };
    this.db.users.push(newUser);
    saveDatabase(this.db);
    return newUser;
  }

  async findUserByEmail(email: string): Promise<DbUser | undefined> {
    return this.db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async findUserById(id: string): Promise<DbUser | undefined> {
    return this.db.users.find((u) => u.id === id);
  }

  async updateUser(
    userId: string,
    updates: Partial<DbUser>,
  ): Promise<DbUser | null> {
    const index = this.db.users.findIndex((u) => u.id === userId);
    if (index === -1) return null;
    const updated = { ...this.db.users[index], ...updates };
    this.db.users[index] = updated;
    saveDatabase(this.db);
    return updated;
  }

  // -------------------------
  // STORES
  // -------------------------
  async createStore(store: Omit<DbStore, "id">): Promise<DbStore> {
    const newStore: DbStore = {
      ...store,
      id: crypto.randomUUID(),
      plan: (store.plan as any) ?? "basic",
      trialEndsAt: store.trialEndsAt ?? null,
      billingStatus: (store.billingStatus as any) ?? "trial",
      categories: store.categories ?? [],
    };
    this.db.stores.push(newStore);
    saveDatabase(this.db);
    return newStore;
  }

  async getStoreById(id: string): Promise<DbStore | undefined> {
    return this.db.stores.find((s) => s.id === id);
  }

  async listStores(): Promise<DbStore[]> {
    return this.db.stores;
  }

  async updateStore(
    storeId: string,
    updates: Partial<DbStore>,
  ): Promise<DbStore | null> {
    const index = this.db.stores.findIndex((s) => s.id === storeId);
    if (index === -1) return null;

    const updated: DbStore = { ...this.db.stores[index], ...updates };

    if (updated.plan === undefined) updated.plan = "basic";
    if (updated.trialEndsAt === undefined) updated.trialEndsAt = null;
    if (updated.billingStatus === undefined) updated.billingStatus = "trial";
    if (updated.categories === undefined) {
      updated.categories = this.db.stores[index].categories ?? [];
    }

    this.db.stores[index] = updated;
    saveDatabase(this.db);
    return updated;
  }

  async deleteStore(storeId: string): Promise<boolean> {
    const before = this.db.stores.length;

    this.db.stores = this.db.stores.filter((s) => s.id !== storeId);
    this.db.posts = this.db.posts.filter((p) => p.storeId !== storeId);
    this.db.users = this.db.users.filter((u) => u.storeId !== storeId);

    if (this.db.stores.length !== before) {
      saveDatabase(this.db);
      return true;
    }
    return false;
  }

  // -------------------------
  // POSTS
  // -------------------------
  async createPost(post: Omit<DbPost, "id">): Promise<DbPost> {
    const newPost: DbPost = { ...post, id: crypto.randomUUID() };
    this.db.posts.push(newPost);
    saveDatabase(this.db);
    return newPost;
  }

  async listPosts(): Promise<DbPost[]> {
    return this.db.posts;
  }

  async getPostsByStore(storeId: string): Promise<DbPost[]> {
    return this.db.posts.filter((p) => p.storeId === storeId);
  }

  async getPostById(postId: string): Promise<DbPost | undefined> {
    return this.db.posts.find((p) => p.id === postId);
  }

  async updatePost(
    postId: string,
    updates: Partial<DbPost>,
  ): Promise<DbPost | null> {
    const index = this.db.posts.findIndex((p) => p.id === postId);
    if (index === -1) return null;
    const updated = { ...this.db.posts[index], ...updates };
    this.db.posts[index] = updated;
    saveDatabase(this.db);
    return updated;
  }

  async deletePost(postId: string): Promise<boolean> {
    const before = this.db.posts.length;
    this.db.posts = this.db.posts.filter((p) => p.id !== postId);
    if (this.db.posts.length !== before) {
      saveDatabase(this.db);
      return true;
    }
    return false;
  }
}

export const storage = new DbStorage();
export type { DbUser, DbStore, DbPost };
