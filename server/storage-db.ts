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

  // Tryggjum shape
  const db: DatabaseShape = {
    users: raw.users ?? [],
    stores: raw.stores ?? [],
    posts: raw.posts ?? [],
  };

  return db;
}

function saveDatabase(db: DatabaseShape) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

export class DbStorage {
  private db: DatabaseShape;

  constructor() {
    this.db = loadDatabase();

    // "Migration": samræma plan / trial / billing reiti
    let changed = false;

    for (const s of this.db.stores as any[]) {
      // Gamli reiturinn: planType -> nýtt: plan
      if (s.plan === undefined) {
        if (s.planType !== undefined) {
          s.plan = s.planType;
        } else {
          s.plan = "basic";
        }
        changed = true;
      }

      // trialEndsAt má vera null en ekki undefined
      if (s.trialEndsAt === undefined) {
        s.trialEndsAt = null;
        changed = true;
      }

      // Gamli reiturinn: billingActive -> nýtt: billingStatus
      if (s.billingStatus === undefined) {
        if (s.billingActive === true) {
          s.billingStatus = "active";
        } else {
          // default: verslun í trial nema annað sé skilgreint
          s.billingStatus = "trial";
        }
        changed = true;
      }

      // Hreinsa gamla reiti ef þeir eru til
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

  // USERS
  async createUser(user: Omit<User, "id">): Promise<User> {
    const newUser: User = { ...user, id: crypto.randomUUID() };
    this.db.users.push(newUser);
    saveDatabase(this.db);
    return newUser;
  }

  async findUserByEmail(email: string): Promise<User | undefined> {
    return this.db.users.find((u) => u.email === email);
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

    const existing: any = this.db.users[index];
    const updated: any = { ...existing, ...updates };

    this.db.users[index] = updated;
    saveDatabase(this.db);

    return updated as User;
  }

  // STORES
  async createStore(
    store: Omit<Store, "id"> & Record<string, any>,
  ): Promise<Store & any> {
    const newStore: any = {
      ...store,
      id: crypto.randomUUID(),
    };

    // Sjálfgefin gildi fyrir plan / trial / billing
    if (newStore.plan === undefined) newStore.plan = "basic";
    if (newStore.trialEndsAt === undefined) newStore.trialEndsAt = null;
    if (newStore.billingStatus === undefined) newStore.billingStatus = "trial";

    this.db.stores.push(newStore);
    saveDatabase(this.db);
    return newStore as Store & any;
  }

  async getStoreById(id: string): Promise<(Store & any) | undefined> {
    return this.db.stores.find((s: any) => s.id === id) as any;
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
    const updated: any = { ...existing, ...updates };

    // Tryggjum gildi eftir update
    if (updated.plan === undefined) updated.plan = "basic";
    if (updated.trialEndsAt === undefined) updated.trialEndsAt = null;
    if (updated.billingStatus === undefined) {
      updated.billingStatus = "trial";
    }

    (this.db.stores as any[])[index] = updated;
    saveDatabase(this.db);

    return updated as Store & any;
  }

  // POSTS
  async createPost(
    post: Omit<SalePost, "id"> & Record<string, any>,
  ): Promise<SalePost & any> {
    const newPost: any = { ...post, id: crypto.randomUUID() };
    this.db.posts.push(newPost);
    saveDatabase(this.db);
    return newPost as SalePost & any;
  }

  async listPosts(): Promise<(SalePost & any)[]> {
    return this.db.posts as any;
  }

  async getPostsByStore(storeId: string): Promise<(SalePost & any)[]> {
    return this.db.posts.filter((p: any) => p.storeId === storeId) as any;
  }

  async getPostById(postId: string): Promise<(SalePost & any) | undefined> {
    return this.db.posts.find((p: any) => p.id === postId) as any;
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

    return updated as SalePost & any;
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
