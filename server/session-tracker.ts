/**
 * session-tracker.ts
 *
 * Drop-in Express middleware that:
 *  1. Reads (or creates) a persistent `utsalapp_sid` cookie for every visitor.
 *  2. Logs every API request as an InteractionEvent.
 *  3. Writes each event to the PostgreSQL `interactions` table.
 *  4. Keeps a lightweight in-memory cache (latest 1 000 events) for fast
 *     admin queries without hitting the DB on every read.
 *  5. Exposes helper functions so route handlers can log richer events
 *     (page_view, search, click) without knowing about the storage layer.
 *
 * Table schema (already created via psql):
 *
 *   CREATE TABLE interactions (
 *     id          BIGSERIAL PRIMARY KEY,
 *     session_id  TEXT        NOT NULL,
 *     event_type  TEXT        NOT NULL,
 *     target      TEXT,
 *     path        TEXT        NOT NULL,
 *     method      TEXT        NOT NULL DEFAULT 'GET',
 *     timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *     meta        JSONB
 *   );
 */

import { randomUUID } from "crypto";
import { Pool } from "pg";
import type { Request, Response, NextFunction, RequestHandler } from "express";

// ─── PostgreSQL connection pool ───────────────────────────────────────────────

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 3_000,
  ssl: process.env.PGHOST !== "localhost" && process.env.PGHOST !== "helium"
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("[session-tracker] pg pool error:", err.message);
});

export { pool as analyticsPool };

// ─── Auto-create table on startup ────────────────────────────────────────────

export async function initDb(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS interactions (
        id          BIGSERIAL PRIMARY KEY,
        session_id  TEXT        NOT NULL,
        event_type  TEXT        NOT NULL,
        target      TEXT,
        path        TEXT        NOT NULL,
        method      TEXT        NOT NULL DEFAULT 'GET',
        timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        meta        JSONB
      );
      CREATE INDEX IF NOT EXISTS idx_interactions_timestamp ON interactions (timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_interactions_event_type ON interactions (event_type);
      CREATE INDEX IF NOT EXISTS idx_interactions_target ON interactions (target);
    `);
    console.log("[session-tracker] DB ready — interactions table ok");
  } catch (err: any) {
    console.error("[session-tracker] initDb failed:", err.message);
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | "page_view"
  | "search"
  | "click"
  | "api_request"
  | "other";

export interface InteractionEvent {
  id?: string | number;
  session_id: string;
  event_type: EventType;
  target?: string | null;
  path: string;
  method: string;
  timestamp: string; // ISO-8601
  meta?: Record<string, unknown> | null;
}

// ─── In-memory cache (latest MAX_CACHE events for fast admin reads) ────────────

const MAX_CACHE = 1_000;
const cache: InteractionEvent[] = [];

function addToCache(event: InteractionEvent): void {
  if (cache.length >= MAX_CACHE) cache.shift();
  cache.push(event);
}

// ─── Database writer (fire-and-forget, never blocks a request) ────────────────

async function persistEvent(event: InteractionEvent): Promise<void> {
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
        event.meta ? JSON.stringify(event.meta) : null,
      ],
    );
  } catch (err: any) {
    console.error("[session-tracker] DB write failed:", err.message);
  }
}

/** Store event in both cache and database (async, non-blocking). */
function storeEvent(event: InteractionEvent): void {
  addToCache(event);
  persistEvent(event); // intentionally not awaited
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAME = "utsalapp_sid";
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header
      .split(";")
      .map((pair) => pair.trim().split("="))
      .filter(([k]) => !!k)
      .map(([k, ...v]) => [k.trim(), v.join("=").trim()]),
  );
}

function readSessionId(req: Request): string | null {
  return parseCookies(req.headers.cookie)[COOKIE_NAME] ?? null;
}

function writeSessionId(res: Response, sessionId: string): void {
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

// ─── Path classifier ──────────────────────────────────────────────────────────

function classifyPath(method: string, path: string, hasQuery = false): EventType {
  if (method === "GET" && /^\/api\/v1\/posts\/[^/]+$/.test(path))
    return "page_view";
  if (method === "GET" && /\/posts/.test(path) && hasQuery)
    return "search";
  if (method === "GET" && /\/posts/.test(path)) return "page_view";
  if (method === "GET" && /\/stores/.test(path)) return "page_view";
  if (/analyze-search/.test(path)) return "search";
  if (/^\/api\//.test(path)) return "api_request";
  return "other";
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * `sessionTracker` — register with `app.use(sessionTracker)` **before**
 * your route handlers.
 *
 * - Creates an `utsalapp_sid` UUID cookie for first-time visitors.
 * - Attaches `req.sessionId` for downstream use.
 * - Persists every API request to the `interactions` PostgreSQL table.
 */
export const sessionTracker: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let sessionId = readSessionId(req);
  if (!sessionId) {
    sessionId = randomUUID();
    writeSessionId(res, sessionId);
  }
  (req as any).sessionId = sessionId;

  const path = req.path;
  const skip =
    path.startsWith("/uploads/") ||
    path === "/health" ||
    !path.startsWith("/api/");

  if (!skip) {
    const qParam = req.query.q as string | undefined;
    const meta: Record<string, unknown> | undefined = qParam
      ? { q: qParam }
      : undefined;

    storeEvent({
      session_id: sessionId,
      event_type: classifyPath(req.method, path, !!qParam),
      path,
      method: req.method,
      timestamp: new Date().toISOString(),
      meta,
    });
  }

  next();
};

// ─── Manual event logger (call from any route handler) ───────────────────────

/**
 * Log a richer interaction from inside a route handler.
 *
 * @example
 * router.get("/posts/:id", (req, res) => {
 *   logEvent(req, "page_view", `/post/${req.params.id}`, { postId: req.params.id });
 * });
 */
export function logEvent(
  req: Request,
  eventType: EventType,
  target?: string,
  meta?: Record<string, unknown>,
): void {
  const sessionId =
    (req as any).sessionId ?? readSessionId(req) ?? "unknown";
  storeEvent({
    session_id: sessionId,
    event_type: eventType,
    target: target ?? null,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    meta,
  });
}

// ─── Query helpers (admin endpoints call these) ───────────────────────────────

/** Latest N events from the in-memory cache (fast). */
export function getAllEvents(limit = 100): InteractionEvent[] {
  return cache.slice(-limit).reverse().map((e, i) => ({
    ...e,
    id: e.id ?? `mem-${Date.now()}-${i}`,
  }));
}

/** All cached events for a specific session. */
export function getEventsBySession(sessionId: string): InteractionEvent[] {
  return cache.filter((e) => e.session_id === sessionId);
}

/** Session summary built from the in-memory cache (fast, used for live count). */
export function getSessionSummary() {
  const bySession: Record<string, number> = {};
  for (const e of cache) {
    bySession[e.session_id] = (bySession[e.session_id] ?? 0) + 1;
  }
  const counts: Record<string, number> = {};
  for (const e of cache) counts[e.path] = (counts[e.path] ?? 0) + 1;
  const top_paths = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .map(([path, count]) => ({ path, count }));

  return {
    total_events_cached: cache.length,
    unique_sessions: Object.keys(bySession).length,
    top_paths,
  };
}

/**
 * DB-backed summary — persistent across server restarts.
 * Combines live in-memory stats with DB aggregates.
 */
export async function getDbSummary(since?: Date, until?: Date): Promise<{
  total_events_db: number;
  unique_sessions: number;
  top_paths: { path: string; count: number }[];
  by_event_type: { event_type: string; count: number }[];
  recent_searches: { q: string; count: number }[];
}> {
  const conditions: string[] = [];
  const params: string[] = [];
  if (since)  { params.push(since.toISOString());  conditions.push(`timestamp >= $${params.length}`); }
  if (until)  { params.push(until.toISOString());  conditions.push(`timestamp <= $${params.length}`); }
  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const searchConditions = [`event_type = 'search'`, `meta->>'q' IS NOT NULL`, ...conditions];
  const whereSearchClause = `WHERE ${searchConditions.join(" AND ")}`;

  const [totalRes, sessionsRes, pathsRes, typesRes, searchesRes] =
    await Promise.all([
      pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM interactions ${whereClause}`,
        params,
      ),
      pool.query<{ count: string }>(
        `SELECT COUNT(DISTINCT session_id)::text AS count FROM interactions ${whereClause}`,
        params,
      ),
      pool.query<{ path: string; count: string }>(
        `SELECT path, COUNT(*)::text AS count
           FROM interactions
           ${whereClause}
          GROUP BY path
          ORDER BY count DESC
          LIMIT 20`,
        params,
      ),
      pool.query<{ event_type: string; count: string }>(
        `SELECT event_type, COUNT(*)::text AS count
           FROM interactions
           ${whereClause}
          GROUP BY event_type
          ORDER BY count DESC`,
        params,
      ),
      pool.query<{ q: string; count: string }>(
        `SELECT meta->>'q' AS q, COUNT(*)::text AS count
           FROM interactions
          ${whereSearchClause}
          GROUP BY meta->>'q'
          ORDER BY count DESC
          LIMIT 20`,
        params,
      ),
    ]);

  return {
    total_events_db: parseInt(totalRes.rows[0]?.count ?? "0"),
    unique_sessions: parseInt(sessionsRes.rows[0]?.count ?? "0"),
    top_paths: pathsRes.rows.map((r) => ({
      path: r.path,
      count: parseInt(r.count),
    })),
    by_event_type: typesRes.rows.map((r) => ({
      event_type: r.event_type,
      count: parseInt(r.count),
    })),
    recent_searches: searchesRes.rows.map((r) => ({
      q: r.q,
      count: parseInt(r.count),
    })),
  };
}

/**
 * Query the DB directly for aggregate stats — used by AI/analytics modules.
 * Returns data beyond what fits in the in-memory cache.
 */
export async function queryAnalytics(opts?: {
  limit?: number;
  event_type?: EventType;
  since?: Date;
}): Promise<InteractionEvent[]> {
  const conditions: string[] = [];
  const values: unknown[] = [];
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

  const { rows } = await pool.query<InteractionEvent>(
    `SELECT id, session_id, event_type, target, path, method,
            timestamp, meta
       FROM interactions
       ${where}
       ORDER BY timestamp DESC
       LIMIT $${i}`,
    [...values, limit],
  );
  return rows;
}
