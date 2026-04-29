// client/src/pages/AnalyticsDashboard.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Eye, Search, Smartphone, ArrowLeft, TrendingUp,
  MousePointerClick, Store, ExternalLink,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardData = {
  summary: {
    page_views: number;
    unique_users: number;
    searches: number;
    pwa_installs: number;
    ad_clicks: number;
  };
  top_offers: { offer_id: string; offer_title: string; store_name: string; clicks: number }[];
  top_searches: { term: string; count: number }[];
  per_store: {
    store_id: string;
    store_name: string;
    store_views: number;
    ad_clicks: number;
    store_clicks: number;
    offer_saves: number;
  }[];
  daily_trend: { day: string; count: number }[];
  by_event_name: { event_name: string; count: number }[];
};

// ─── Date range ───────────────────────────────────────────────────────────────

type Range = "today" | "yesterday" | "7d" | "30d" | "all";

const RANGE_LABELS: Record<Range, string> = {
  today:     "Í dag",
  yesterday: "Í gær",
  "7d":      "7 dagar",
  "30d":     "30 dagar",
  all:       "Allt",
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeToParams(range: Range): { since?: string; until?: string } {
  const now = new Date();
  if (range === "today") return { since: toDateStr(now) };
  if (range === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { since: toDateStr(y), until: toDateStr(now) };
  }
  if (range === "7d")  { const d = new Date(now); d.setDate(d.getDate() - 7);  return { since: toDateStr(d) }; }
  if (range === "30d") { const d = new Date(now); d.setDate(d.getDate() - 30); return { since: toDateStr(d) }; }
  return {};
}

// ─── Mini bar chart via SVG ───────────────────────────────────────────────────

function padTrend(
  data: { day: string; count: number }[],
  days = 7,
): { day: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const d of data) map[d.day] = d.count;
  const result: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push({ day: key, count: map[key] ?? 0 });
  }
  return result;
}

function TrendChart({ data }: { data: { day: string; count: number }[] }) {
  // Always show at least 7 days so bars have sensible width
  const padded = padTrend(data, Math.max(7, data.length));
  const total = padded.reduce((s, d) => s + d.count, 0);

  if (total === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-muted-foreground">
        Engin gögn í þessu tímabili
      </div>
    );
  }

  const maxVal = Math.max(...padded.map((d) => d.count), 1);
  const W = 300;
  const H = 72;
  const gap = 3;
  const n = padded.length;
  const barW = Math.max(4, Math.floor((W - gap * (n + 1)) / n));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 72 }} preserveAspectRatio="none">
        {padded.map((d, i) => {
          const barH = d.count > 0 ? Math.max(4, (d.count / maxVal) * (H - 4)) : 2;
          const x = gap + i * (barW + gap);
          const y = H - barH;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={2}
              fill={d.count > 0 ? "#ff4d00" : "#f3f4f6"}
              opacity={d.count > 0 ? 0.9 : 1}
            />
          );
        })}
      </svg>
      <div className="flex justify-between mt-1 text-[9px] text-muted-foreground px-0.5">
        {[padded[0], padded[Math.floor(n / 2)], padded[n - 1]].map((d, i) => (
          <span key={i}>{d?.day?.slice(5)}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent = "#ff4d00",
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <Card className="p-3 flex items-center gap-3">
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-none mb-1">{label}</p>
        <p className="text-lg font-bold leading-none">{value}</p>
      </div>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("today");

  const { since, until } = rangeToParams(range);
  const qs = [since && `since=${since}`, until && `until=${until}`].filter(Boolean).join("&");

  const dashUrl = `/api/v1/admin/analytics/dashboard${qs ? `?${qs}` : ""}`;

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["analytics-dashboard", range],
    queryFn: () => apiFetch<DashboardData>(dashUrl),
    enabled: isAdmin && !authLoading,
  });

  if (authLoading) {
    return <div className="p-8 text-center text-muted-foreground">Hleður...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Þú hefur ekki aðgang að þessum síðum.
      </div>
    );
  }

  const summary = data?.summary;
  const topOffers = data?.top_offers ?? [];
  const topSearches = data?.top_searches ?? [];
  const perStore = data?.per_store ?? [];
  const dailyTrend = data?.daily_trend ?? [];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate(-1)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-base font-bold flex-1">Greiningar</h1>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">

        {/* Date range tabs */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              data-testid={`button-range-${r}`}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                range === r ? "text-white" : "bg-muted text-muted-foreground"
              }`}
              style={range === r ? { background: "#ff4d00" } : {}}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Summary cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3" data-testid="analytics-summary">
            <StatCard icon={Eye}              label="Heimsóknir"       value={summary?.page_views   ?? 0} />
            <StatCard icon={Users}            label="Einstaklingar"    value={summary?.unique_users ?? 0} accent="#6366f1" />
            <StatCard icon={MousePointerClick} label="Smellir"          value={summary?.ad_clicks    ?? 0} accent="#ff4d00" />
            <StatCard icon={Search}           label="Leitir"           value={summary?.searches     ?? 0} accent="#0ea5e9" />
          </div>
        )}

        {/* Daily trend */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "#ff4d00" }} />
            <h2 className="text-sm font-semibold">Smellir á dag</h2>
          </div>
          {isLoading ? (
            <div className="h-20 bg-muted animate-pulse rounded" />
          ) : (
            <TrendChart data={dailyTrend} />
          )}
        </Card>

        {/* Top offers */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <MousePointerClick className="w-4 h-4" style={{ color: "#ff4d00" }} />
            <h2 className="text-sm font-semibold">Vinsælustu tilboð</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}
            </div>
          ) : topOffers.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Engir smellir á tilboð í þessu tímabili
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {topOffers.map((offer, i) => (
                <div
                  key={offer.offer_id ?? i}
                  className="flex items-center justify-between py-2.5 gap-2"
                  data-testid={`row-offer-${offer.offer_id}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                      style={{ background: i === 0 ? "#ff4d00" : "#d1d5db" }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{offer.offer_title ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{offer.store_name ?? "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-sm font-bold" style={{ color: "#ff4d00" }}>{offer.clicks}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6"
                      onClick={() => window.open(`/post/${offer.offer_id}`, "_blank")}
                      data-testid={`button-open-offer-${offer.offer_id}`}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Top search terms */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4" style={{ color: "#ff4d00" }} />
            <h2 className="text-sm font-semibold">Vinsælustu leitaryrði</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
            </div>
          ) : topSearches.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Engar leitir skráðar í þessu tímabili
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {topSearches.map((s, i) => (
                <div
                  key={s.term}
                  className="flex items-center justify-between py-2 gap-2"
                  data-testid={`row-search-${i}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                      style={{ background: i === 0 ? "#ff4d00" : "#d1d5db" }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs truncate">{s.term}</span>
                  </div>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: "#ff4d00" }}>{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Per-store breakdown */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Store className="w-4 h-4" style={{ color: "#ff4d00" }} />
            <h2 className="text-sm font-semibold">Verslanir</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}
            </div>
          ) : perStore.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Engin gögn í þessu tímabili
            </p>
          ) : (
            <div className="space-y-0 divide-y divide-border">
              {perStore.map((store) => (
                <div
                  key={store.store_id}
                  className="py-3"
                  data-testid={`row-store-${store.store_id}`}
                >
                  <p className="text-xs font-semibold mb-2">{store.store_name ?? "—"}</p>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <StoreMetric label="Verslunar-skoðanir" value={store.store_views} />
                    <StoreMetric label="Augl. smellir" value={store.ad_clicks} accent="#ff4d00" />
                    <StoreMetric label="Vefs. smellir" value={store.store_clicks} />
                    <StoreMetric label="Vistanir" value={store.offer_saves} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>
    </div>
  );
}

function StoreMetric({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-muted/50 rounded p-1.5">
      <p className="text-sm font-bold" style={accent ? { color: accent } : {}}>{value}</p>
      <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">{label}</p>
    </div>
  );
}
