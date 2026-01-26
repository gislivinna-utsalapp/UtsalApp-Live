// server/access-db.ts
import fs from "fs";
import path from "path";

type AnyStore = Record<string, any>;
type DatabaseShape = {
  users?: any[];
  stores?: AnyStore[];
  posts?: any[];
  [key: string]: any;
};

function resolveDbFile(): string {
  // Samræmt við Render persistent disk setup sem þú lýstir (/var/data)
  const prodPath = "/var/data/database.json";

  try {
    const dir = path.dirname(prodPath);
    if (fs.existsSync(dir)) return prodPath;
  } catch {
    // no-op
  }

  return path.join(process.cwd(), "database.json");
}

const DB_FILE = resolveDbFile();

function loadDb(): DatabaseShape {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { users: [], stores: [], posts: [] };
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    if (!raw.trim()) return { users: [], stores: [], posts: [] };
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      stores: Array.isArray(parsed.stores) ? parsed.stores : [],
      posts: Array.isArray(parsed.posts) ? parsed.posts : [],
      ...parsed,
    };
  } catch {
    return { users: [], stores: [], posts: [] };
  }
}

function saveDb(db: DatabaseShape): void {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

export function getStoreById(storeId: string): AnyStore | null {
  const db = loadDb();
  const stores = Array.isArray(db.stores) ? db.stores : [];
  const found = stores.find((s) => String(s?.id) === String(storeId));
  return found ?? null;
}

export function updateStoreById(
  storeId: string,
  patch: Partial<AnyStore>,
): AnyStore | null {
  const db = loadDb();
  const stores = Array.isArray(db.stores) ? db.stores : [];
  const idx = stores.findIndex((s) => String(s?.id) === String(storeId));
  if (idx === -1) return null;

  const updated = { ...stores[idx], ...patch };
  stores[idx] = updated;
  db.stores = stores;

  saveDb(db);
  return updated;
}

export function setStoreAccessEndsAt(
  storeId: string,
  accessEndsAtIso: string | null,
): AnyStore | null {
  return updateStoreById(storeId, { accessEndsAt: accessEndsAtIso });
}

export function extendStoreAccess(
  storeId: string,
  days: number,
): AnyStore | null {
  const store = getStoreById(storeId);
  if (!store) return null;

  const now = new Date();
  const base = store.accessEndsAt ? new Date(store.accessEndsAt) : now;

  // Ef accessEndsAt er í fortíð, byrjum við frá "núna"
  const effectiveBase = base > now ? base : now;

  const extended = new Date(
    effectiveBase.getTime() + days * 24 * 60 * 60 * 1000,
  );
  return updateStoreById(storeId, { accessEndsAt: extended.toISOString() });
}
