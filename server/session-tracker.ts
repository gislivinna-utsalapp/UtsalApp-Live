/**
 * session-tracker.ts
 *
 * Drop-in Express middleware that:
 *  1. Reads (or creates) a persistent `utsalapp_sid` cookie for every visitor.
 *  2. Logs every request as an interaction event (path, method, timestamp,
 *     session_id, event_type).
 *  3. Exposes helper functions so route handlers can log richer events
 *     (page_view, search, click) without knowing about the store internals.
 *  4. Provides a read-only admin endpoint to inspect the collected data.
 *
 * Storage: in-memory ring-buffer (cap 10 000 events).
 * Swap `interactions` for a database call when you're ready to persist.
 */

import { randomUUID } from "crypto";
import type { Request, Response, NextFunction, RequestHandler } from "express";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType =
  | "page_view"
  | "search"
  | "click"
  | "api_request"
  | "other";

export interface InteractionEvent {
  id: string;
  session_id: string;
  event_type: EventType;
  path: string;
  method: string;
  timestamp: string; // ISO-8601
  meta?: Record<string, unknown>; // optional payload (search query, post id…)
}

// ─── In-memory store (ring-buffer, max MAX_EVENTS entries) ────────────────────

const MAX_EVENTS = 10_000;
const interactions: InteractionEvent[] = [];

function storeEvent(event: InteractionEvent): void {
  if (interactions.length >= MAX_EVENTS) {
    interactions.shift(); // drop oldest
  }
  interactions.push(event);
}

// ─── Cookie helpers ───────────────────────────────────────────────────────────

const COOKIE_NAME = "utsalapp_sid";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year

/** Parse a raw Cookie header string into a key→value map. */
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

/** Read the session_id from the incoming cookies, or return null. */
function readSessionId(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[COOKIE_NAME] || null;
}

/** Set the session_id cookie on the response. */
function writeSessionId(res: Response, sessionId: string): void {
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE_SECONDS * 1000, // Express uses milliseconds
    path: "/",
  });
}

// ─── Classify request paths into event types ──────────────────────────────────

function classifyPath(method: string, path: string): EventType {
  if (method === "GET" && /^\/api\/v1\/posts\/[^/]+$/.test(path))
    return "page_view";
  if (method === "GET" && /\/posts/.test(path) && path.includes("q="))
    return "search";
  if (method === "GET" && /\/posts/.test(path)) return "page_view";
  if (method === "GET" && /\/stores/.test(path)) return "page_view";
  if (/^\/api\//.test(path)) return "api_request";
  return "other";
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * `sessionTracker` — attach this with `app.use(sessionTracker)` **before**
 * your route registrations.
 *
 * - Creates a `utsalapp_sid` UUID cookie if the visitor doesn't have one.
 * - Attaches `req.sessionId` so route handlers can read it.
 * - Logs every API request as an InteractionEvent.
 */
export const sessionTracker: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // 1. Resolve or create session_id
  let sessionId = readSessionId(req);
  if (!sessionId) {
    sessionId = randomUUID();
    writeSessionId(res, sessionId);
  }

  // Attach to request so downstream handlers can reference it
  (req as any).sessionId = sessionId;

  // 2. Log API requests (skip static assets & health checks)
  const path = req.path;
  const skip =
    path.startsWith("/uploads/") ||
    path === "/health" ||
    !path.startsWith("/api/");

  if (!skip) {
    storeEvent({
      id: randomUUID(),
      session_id: sessionId,
      event_type: classifyPath(req.method, path),
      path,
      method: req.method,
      timestamp: new Date().toISOString(),
      meta: req.query.q ? { q: req.query.q } : undefined,
    });
  }

  next();
};

// ─── Manual event logger (call from route handlers) ──────────────────────────

/**
 * Log a custom interaction from inside a route handler.
 *
 * @example
 * router.get("/posts/:id", (req, res) => {
 *   logEvent(req, "page_view", { postId: req.params.id });
 *   …
 * });
 */
export function logEvent(
  req: Request,
  eventType: EventType,
  meta?: Record<string, unknown>,
): void {
  const sessionId = (req as any).sessionId ?? readSessionId(req) ?? "unknown";
  storeEvent({
    id: randomUUID(),
    session_id: sessionId,
    event_type: eventType,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    meta,
  });
}

// ─── Read-only query helpers ──────────────────────────────────────────────────

export function getAllEvents(): InteractionEvent[] {
  return [...interactions];
}

export function getEventsBySession(sessionId: string): InteractionEvent[] {
  return interactions.filter((e) => e.session_id === sessionId);
}

export function getSessionSummary() {
  const bySession: Record<string, number> = {};
  for (const e of interactions) {
    bySession[e.session_id] = (bySession[e.session_id] ?? 0) + 1;
  }
  return {
    total_events: interactions.length,
    unique_sessions: Object.keys(bySession).length,
    top_paths: topPaths(20),
  };
}

function topPaths(n: number) {
  const counts: Record<string, number> = {};
  for (const e of interactions) {
    counts[e.path] = (counts[e.path] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([path, count]) => ({ path, count }));
}
