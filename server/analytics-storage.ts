// server/analytics-storage.ts
// File-based analytics storage that works on Render's persistent disk (/var/data)
// and locally (./analytics.json). No PostgreSQL required.

import fs from "fs";
import path from "path";

export interface AnalyticsEvent {
  id: string;
  event_name: string;
  store_id?: string | null;
  store_name?: string | null;
  offer_id?: string | null;
  offer_title?: string | null;
  user_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string; // ISO 8601
}

function resolveAnalyticsFile(): string {
  const prodPath = "/var/data/analytics.json";
  try {
    if (fs.existsSync(path.dirname(prodPath))) return prodPath;
  } catch {}
  return path.join(process.cwd(), "analytics.json");
}

const ANALYTICS_FILE = resolveAnalyticsFile();
const MAX_EVENTS = 50_000; // keep memory bounded

// In-memory store — loaded once at startup
let events: AnalyticsEvent[] = loadFromDisk();
let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function loadFromDisk(): AnalyticsEvent[] {
  try {
    if (fs.existsSync(ANALYTICS_FILE)) {
      const raw = fs.readFileSync(ANALYTICS_FILE, "utf8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        console.log(`[analytics-storage] Loaded ${parsed.length} events from ${ANALYTICS_FILE}`);
        return parsed as AnalyticsEvent[];
      }
    }
  } catch (err: any) {
    console.error("[analytics-storage] Load failed:", err.message);
  }
  return [];
}

function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    if (!dirty) return;
    try {
      fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(events), "utf8");
      dirty = false;
    } catch (err: any) {
      console.error("[analytics-storage] Save failed:", err.message);
    }
  }, 2_000); // batch writes — save 2 s after last event
}

/** Record a new analytics event. Non-blocking. */
export function recordEvent(
  payload: Omit<AnalyticsEvent, "id" | "created_at">
): void {
  const e: AnalyticsEvent = {
    id: Math.random().toString(36).slice(2, 10),
    created_at: new Date().toISOString(),
    ...payload,
  };
  events.push(e);
  // Trim oldest events if too large
  if (events.length > MAX_EVENTS) events = events.slice(-MAX_EVENTS);
  dirty = true;
  scheduleSave();
}

/** Compute dashboard metrics from in-memory events (filtered by date). */
export function queryDashboard(since?: Date, until?: Date) {
  let filtered = events;
  if (since) {
    const s = since.getTime();
    filtered = filtered.filter((e) => new Date(e.created_at).getTime() >= s);
  }
  if (until) {
    const u = until.getTime();
    filtered = filtered.filter((e) => new Date(e.created_at).getTime() <= u);
  }

  // by_event_name
  const nameMap: Record<string, number> = {};
  for (const e of filtered) nameMap[e.event_name] = (nameMap[e.event_name] ?? 0) + 1;
  const by_event_name = Object.entries(nameMap)
    .map(([event_name, count]) => ({ event_name, count }))
    .sort((a, b) => b.count - a.count);

  // top offers (ad_click)
  const offerMap: Record<string, { offer_id: string; offer_title: string; store_name: string; clicks: number }> = {};
  for (const e of filtered) {
    if (e.event_name !== "ad_click") continue;
    const k = e.offer_id ?? "unknown";
    if (!offerMap[k]) offerMap[k] = { offer_id: k, offer_title: e.offer_title ?? k, store_name: e.store_name ?? "", clicks: 0 };
    offerMap[k].clicks++;
  }
  const top_offers = Object.values(offerMap).sort((a, b) => b.clicks - a.clicks).slice(0, 10);

  // per-store
  const storeMap: Record<string, {
    store_id: string; store_name: string;
    store_views: number; ad_clicks: number; store_clicks: number; offer_saves: number;
  }> = {};
  for (const e of filtered) {
    if (!e.store_id) continue;
    const k = e.store_id;
    if (!storeMap[k]) storeMap[k] = { store_id: k, store_name: e.store_name ?? k, store_views: 0, ad_clicks: 0, store_clicks: 0, offer_saves: 0 };
    if (e.event_name === "store_view")  storeMap[k].store_views++;
    if (e.event_name === "ad_click")    storeMap[k].ad_clicks++;
    if (e.event_name === "store_click") storeMap[k].store_clicks++;
    if (e.event_name === "offer_saved") storeMap[k].offer_saves++;
  }
  const per_store = Object.values(storeMap).sort((a, b) => b.ad_clicks - a.ad_clicks);

  // daily ad_click trend
  const dailyMap: Record<string, number> = {};
  for (const e of filtered) {
    if (e.event_name !== "ad_click") continue;
    const day = e.created_at.slice(0, 10);
    dailyMap[day] = (dailyMap[day] ?? 0) + 1;
  }
  const daily_trend = Object.entries(dailyMap)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  // summary counts
  const page_views   = filtered.filter((e) => e.event_name === "page_view").length;
  const unique_users = new Set(filtered.map((e) => e.user_id).filter(Boolean)).size;
  const searches     = filtered.filter((e) => e.event_name === "search").length;
  const pwa_installs = filtered.filter((e) => e.event_name === "add_to_homescreen").length;
  const ad_clicks    = filtered.filter((e) => e.event_name === "ad_click").length;

  return {
    by_event_name,
    top_offers,
    per_store,
    daily_trend,
    summary: { page_views, unique_users, searches, pwa_installs, ad_clicks },
  };
}

/** Return total event count (for health checks). */
export function getTotalEventCount(): number {
  return events.length;
}
