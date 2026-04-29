// client/src/lib/analytics.ts
// Lightweight, fire-and-forget analytics tracking utility.
// All calls are non-blocking and never throw to the caller.

const ANON_ID_KEY = "utsalapp_anon_id";

function getAnonId(): string {
  try {
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(ANON_ID_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

function getUserId(): string {
  try {
    // Try to get logged-in user id from stored token/user info
    const raw = localStorage.getItem("utsalapp_user") ?? localStorage.getItem("user");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.id) return String(parsed.id);
    }
  } catch {}
  return getAnonId();
}

interface TrackPayload {
  event_name: string;
  store_id?: string;
  store_name?: string;
  offer_id?: string;
  offer_title?: string;
  metadata?: Record<string, unknown>;
}

/** Send an analytics event — fire-and-forget, never throws. */
export function track(payload: TrackPayload): void {
  try {
    fetch("/api/v1/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, user_id: getUserId() }),
    }).catch(() => {});
  } catch {}
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

export function trackPageView(screenName: string, extra?: Record<string, unknown>): void {
  track({ event_name: "page_view", metadata: { screen_name: screenName, ...extra } });
}

export function trackAdClick(opts: {
  offerId: string;
  offerTitle?: string;
  storeId?: string;
  storeName?: string;
  position?: number;
}): void {
  track({
    event_name: "ad_click",
    store_id: opts.storeId,
    store_name: opts.storeName,
    offer_id: opts.offerId,
    offer_title: opts.offerTitle,
    metadata: { position: opts.position },
  });
}

export function trackStoreView(storeId: string, storeName?: string, category?: string): void {
  track({ event_name: "store_view", store_id: storeId, store_name: storeName, metadata: { category } });
}

export function trackStoreClick(storeId: string, storeName?: string): void {
  track({ event_name: "store_click", store_id: storeId, store_name: storeName });
}

export function trackSearch(query: string, resultCount: number): void {
  track({ event_name: "search", metadata: { query_text: query, result_count: resultCount } });
}

export function trackOfferSaved(opts: {
  offerId: string;
  offerTitle?: string;
  storeId?: string;
  storeName?: string;
}): void {
  track({
    event_name: "offer_saved",
    store_id: opts.storeId,
    store_name: opts.storeName,
    offer_id: opts.offerId,
    offer_title: opts.offerTitle,
  });
}

export function trackAddToHomescreen(platform: "ios" | "android" | "unknown"): void {
  track({ event_name: "add_to_homescreen", metadata: { platform } });
}
