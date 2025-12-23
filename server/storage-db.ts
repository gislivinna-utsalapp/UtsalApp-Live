// server/storage-db.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import type { User, Store, SalePost } from "@shared/schema";

/**
 * -------------------------
 * DATABASE FILE PATH (FIX)
 * -------------------------
 *
 * Aldrei treysta á process.cwd() í Replit / Deploy.
 * Við festum DB við project root (einu stigi upp frá /server).
 *
 * Einnig hægt að override-a með DB_FILE env ef þarf síðar.
 */

// ESM-safe __dirname / __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, "..");
const DB_FILE = process.env.DB_FILE ?? path.join(PROJECT_ROOT, "database.json");

// Debug – þetta mun segja þér EINU sinni nákvæmlega hvar DB er
console.log("[db] Using database file:", DB_FILE);

interface DatabaseShape {
  users: User[];
  stores: (Store & Record<string, any>)[];
  posts: (SalePost & Record<string, any>)[];
}

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

export class DbStorage {
  private db: DatabaseShape;

  constructor() {
    this.db = loadDatabase();

    // -------------------------
    // MIGRATION / NORMALIZATION
    // -------------------------
    let changed = false;

    for (const s of this.db.stores as any[]) {
      if (s.plan === undefined) {
        s.plan = s.planType ?? "basic";
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
        delete s.planType;
        changed = true;
      }

      if (s.billingActive !== undefined) {
        delete s.billingActive;
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
  async createUser(user: Omit<User, "id">): Promise<User> {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
    };
    this.db.users.push(newUser);
    saveDatabase(this.db);
    return newUser;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.db.users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.id === id);
  }

  async updateUser(
    userId: string,
    updates: Partial<User> & Record<string, any>,
  ): Promise<User | null> {
    const index = this.db.users.findIndex((u) => u.id === userId);
    if (index === -1) return null;

    const updated = { ...this.db.users[index], ...updates };
    this.db.users[index] = updated;
    saveDatabase(this.db);
    return updated as User;
  }

  // -------------------------
  // STORES
  // -------------------------
  async createStore(
    store: Omit<Store, "id"> & Record<string, any>,
  ): Promise<Store & any> {
    const newStore: any = {
      ...store,
      id: crypto.randomUUID(),
      plan: store.plan ?? "basic",
      trialEndsAt: store.trialEndsAt ?? null,
      billingStatus: store.billingStatus ?? "trial",
      categories: store.categories ?? [],
    };

    this.db.stores.push(newStore);
    saveDatabase(this.db);
    return newStore;
  }

  async getStoreById(id: string): Promise<(Store & any) | undefined> {
    return this.db.stores.find((s: any) => s.id === id);
  }

  async listStores(): Promise<(Store & any)[]> {
    return this.db.stores as any;
  }

  async updateStore(
    storeId: string,
    updates: Partial<Store> & Record<string, any>,
  ): Promise<(Store & any) | null> {
    const index = this.db.stores.findIndex((s) => s.id === storeId);
    if (index === -1) return null;

    const updated = { ...this.db.stores[index], ...updates };

    if (updated.plan === undefined) updated.plan = "basic";
    if (updated.trialEndsAt === undefined) updated.trialEndsAt = null;
    if (updated.billingStatus === undefined) updated.billingStatus = "trial";
    if (updated.categories === undefined) {
      updated.categories = this.db.stores[index].categories ?? [];
    }

    this.db.stores[index] = updated;
    saveDatabase(this.db);
    return updated as Store & any;
  }

  async deleteStore(storeId: string): Promise<boolean> {
    const before = this.db.stores.length;

    this.db.stores = this.db.stores.filter((s) => s.id !== storeId);
    this.db.posts = this.db.posts.filter((p) => p.storeId !== storeId);
    this.db.users = this.db.users.filter(
      (u: any) => (u as any).storeId !== storeId,
    );

    if (this.db.stores.length !== before) {
      saveDatabase(this.db);
      return true;
    }
    return false;
  }

  // -------------------------
  // POSTS
  // -------------------------
  async createPost(
    post: Omit<SalePost, "id"> & Record<string, any>,
  ): Promise<SalePost & any> {
    const newPost: any = { ...post, id: crypto.randomUUID() };
    this.db.posts.push(newPost);
    saveDatabase(this.db);
    return newPost;
  }

  async listPosts(): Promise<(SalePost & any)[]> {
    return this.db.posts as any;
  }

  async getPostsByStore(storeId: string): Promise<(SalePost & any)[]> {
    return this.db.posts.filter((p) => p.storeId === storeId) as any;
  }

  async getPostById(postId: string): Promise<(SalePost & any) | undefined> {
    return this.db.posts.find((p) => p.id === postId);
  }

  async updatePost(
    postId: string,
    updates: Partial<SalePost> & Record<string, any>,
  ): Promise<(SalePost & any) | null> {
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
