// server/storage-db.ts
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { User, Store, SalePost } from "@shared/schema";

const DB_FILE = path.join(process.cwd(), "database.json");

interface DatabaseShape {
  users: User[];
  stores: (Store & Record<string, any>)[];
  posts: (SalePost & Record<string, any>)[];
}

function loadDatabase(): DatabaseShape {
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseShape = { users: [], stores: [], posts: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }

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

    let changed = false;

    // --- STORE MIGRATIONS ---
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

      if (s.planType !== undefined) {
        delete s.planType;
        changed = true;
      }

      if (s.billingActive !== undefined) {
        delete s.billingActive;
        changed = true;
      }
    }

    // --- USER MIGRATIONS (CRITICAL) ---
    for (const u of this.db.users as any[]) {
      // tryggjum normalíserað email
      if (typeof u.email === "string") {
        const normalized = u.email.trim().toLowerCase();
        if (u.email !== normalized) {
          u.email = normalized;
          changed = true;
        }
      }

      // fjarlægjum legacy plain password ef það er til
      if ((u as any).password !== undefined) {
        delete (u as any).password;
        changed = true;
      }
    }

    if (changed) {
      saveDatabase(this.db);
    }
  }

  // ---------------- USERS ----------------

  async createUser(user: Omit<User, "id">): Promise<User> {
    const newUser: User = {
      ...user,
      email: user.email.trim().toLowerCase(),
      id: crypto.randomUUID(),
    };

    this.db.users.push(newUser);
    saveDatabase(this.db);
    return newUser;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    const normalized = email.trim().toLowerCase();
    return this.db.users.find(
      (u) => u.email.trim().toLowerCase() === normalized,
    );
  }

  async findUserById(id: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.id === id);
  }

  // ---------------- STORES ----------------

  async createStore(
    store: Omit<Store, "id"> & Record<string, any>,
  ): Promise<Store & any> {
    const newStore: any = {
      ...store,
      id: crypto.randomUUID(),
      plan: store.plan ?? "basic",
      trialEndsAt: store.trialEndsAt ?? null,
      billingStatus: store.billingStatus ?? "trial",
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
    const index = (this.db.stores as any[]).findIndex((s) => s.id === storeId);
    if (index === -1) return null;

    const existing: any = this.db.stores[index];
    const updated: any = {
      ...existing,
      ...updates,
    };

    if (updated.plan === undefined) updated.plan = "basic";
    if (updated.trialEndsAt === undefined) updated.trialEndsAt = null;
    if (updated.billingStatus === undefined) updated.billingStatus = "trial";

    this.db.stores[index] = updated;
    saveDatabase(this.db);
    return updated;
  }

  // ---------------- POSTS ----------------

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
    return this.db.posts.filter((p: any) => p.storeId === storeId);
  }

  async getPostById(postId: string): Promise<(SalePost & any) | undefined> {
    return this.db.posts.find((p: any) => p.id === postId);
  }

  async updatePost(
    postId: string,
    updates: Partial<SalePost> & Record<string, any>,
  ): Promise<(SalePost & any) | null> {
    const index = this.db.posts.findIndex((p) => p.id === postId);
    if (index === -1) return null;

    const existing: any = this.db.posts[index];
    const updated: any = { ...existing, ...updates };

    this.db.posts[index] = updated;
    saveDatabase(this.db);
    return updated;
  }

  async deletePost(postId: string): Promise<boolean> {
    const original = this.db.posts.length;
    this.db.posts = this.db.posts.filter((p) => p.id !== postId);
    const changed = this.db.posts.length !== original;

    if (changed) saveDatabase(this.db);
    return changed;
  }
}

export const storage = new DbStorage();
