import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart2,
  Users,
  Eye,
  Search,
  MousePointerClick,
  TrendingUp,
  Clock,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Summary = {
  total_events_cached: number;
  unique_sessions: number;
  top_paths: { path: string; count: number }[];
};

type Event = {
  id: string | number;
  session_id: string;
  event_type: string;
  path: string;
  method: string;
  timestamp: string;
  meta?: { q?: string; category?: string; location?: string; intent?: string } | null;
};

type Tab = "overview" | "events" | "searches";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("is-IS", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

function eventTypeLabel(t: string) {
  const map: Record<string, string> = {
    page_view: "Síðuskoðun",
    search: "Leit",
    click: "Smellur",
    api_request: "API",
    other: "Annað",
  };
  return map[t] ?? t;
}

function eventTypeBadgeClass(t: string) {
  const map: Record<string, string> = {
    page_view: "bg-blue-100 text-blue-700",
    search: "bg-purple-100 text-purple-700",
    click: "bg-green-100 text-green-700",
    api_request: "bg-gray-100 text-gray-600",
    other: "bg-yellow-100 text-yellow-700",
  };
  return map[t] ?? "bg-gray-100 text-gray-600";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: any;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold leading-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

function TopPathsTable({ paths }: { paths: Summary["top_paths"] }) {
  const max = paths[0]?.count ?? 1;
  return (
    <div className="space-y-1.5">
      {paths.map((row) => (
        <div key={row.path} className="flex items-center gap-2">
          <span
            className="text-xs font-mono text-muted-foreground truncate w-56 flex-shrink-0"
            title={row.path}
          >
            {row.path}
          </span>
          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(row.count / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold w-8 text-right flex-shrink-0">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("utsalapp_token") ||
        localStorage.getItem("token") ||
        ""
      : "";
  const authHeader = { Authorization: `Bearer ${token}` };

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery<Summary>({
    queryKey: ["analytics-summary"],
    enabled: isAdmin,
    refetchInterval: 30_000,
    queryFn: () =>
      apiFetch<Summary>("/api/v1/admin/analytics/summary", {
        headers: authHeader,
      }),
  });

  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useQuery<Event[]>({
    queryKey: ["analytics-events"],
    enabled: isAdmin && (tab === "events" || tab === "searches"),
    refetchInterval: 30_000,
    queryFn: () =>
      apiFetch<Event[]>("/api/v1/admin/analytics/events?limit=500", {
        headers: authHeader,
      }),
  });

  const searches = useMemo(
    () => events.filter((e) => e.event_type === "search"),
    [events],
  );
  const searchesLoading = eventsLoading;
  const refetchSearches = refetchEvents;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center text-muted-foreground">
        Hleður...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center space-y-4">
        <p className="text-muted-foreground">Aðgangur bannaður.</p>
        <Button onClick={() => navigate("/")}>Til baka</Button>
      </div>
    );
  }

  const refetchAll = () => {
    refetchSummary();
    if (tab === "events") refetchEvents();
    if (tab === "searches") refetchSearches();
  };

  // Derived stats from cached summary
  const pageViews =
    summary?.top_paths.reduce((s, r) => s + r.count, 0) ?? 0;

  const searchCount = events.filter((e) => e.event_type === "search").length;

  // Tabs
  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Yfirlit", icon: BarChart2 },
    { key: "events", label: "Atburðir", icon: Clock },
    { key: "searches", label: "Leitir", icon: Search },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => navigate("/admin")}
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold text-base">Greiningar</h1>
          <p className="text-xs text-muted-foreground">
            Gögn um notkun á ÚtsalApp
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={refetchAll}
          data-testid="button-refresh"
          title="Uppfæra"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </header>

      <div className="px-4 pt-4 space-y-4">
        {/* Stat cards */}
        {summaryLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="h-20 animate-pulse bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Users}
              label="Einstakar lotur"
              value={summary?.unique_sessions ?? 0}
              sub="síðan server byrjaði"
            />
            <StatCard
              icon={Eye}
              label="Atburðir í minni"
              value={summary?.total_events_cached ?? 0}
              sub="síðustu 1.000"
            />
            <StatCard
              icon={TrendingUp}
              label="Vinsælasta slóð"
              value={summary?.top_paths[0]?.count ?? 0}
              sub={summary?.top_paths[0]?.path ?? "—"}
            />
            <StatCard
              icon={MousePointerClick}
              label="Slóðir raktar"
              value={summary?.top_paths.length ?? 0}
              sub="mismunandi endapunktar"
            />
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              data-testid={`tab-${key}`}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
        {tab === "overview" && (
          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              Vinsælustu slóðirnar
            </h2>
            {summaryLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-5 rounded bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : summary?.top_paths.length ? (
              <TopPathsTable paths={summary.top_paths} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Engin gögn enn.
              </p>
            )}
          </Card>
        )}

        {/* ── EVENTS TAB ───────────────────────────────────────────────── */}
        {tab === "events" && (
          <div className="space-y-2">
            {eventsLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className="h-14 animate-pulse bg-muted" />
              ))
            ) : eventsError ? (
              <Card className="p-6 text-center text-sm text-destructive">
                Villa við að sækja gögn. Reyndu að uppfæra.
              </Card>
            ) : events.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Engir atburðir skráðir enn.
              </Card>
            ) : (
              events.map((ev) => (
                <Card
                  key={String(ev.id)}
                  className="px-3 py-2 flex items-start gap-3"
                  data-testid={`event-row-${ev.id}`}
                >
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${eventTypeBadgeClass(ev.event_type)}`}
                  >
                    {eventTypeLabel(ev.event_type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono truncate text-foreground">
                      {ev.path}
                    </p>
                    {ev.meta?.q && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        "{ev.meta.q}"
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
                      {ev.session_id.slice(0, 8)}…
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                    {formatTime(ev.timestamp)}
                  </span>
                </Card>
              ))
            )}
          </div>
        )}

        {/* ── SEARCHES TAB ─────────────────────────────────────────────── */}
        {tab === "searches" && (
          <div className="space-y-2">
            {searchesLoading ? (
              [...Array(6)].map((_, i) => (
                <Card key={i} className="h-14 animate-pulse bg-muted" />
              ))
            ) : eventsError ? (
              <Card className="p-6 text-center text-sm text-destructive">
                Villa við að sækja gögn. Reyndu að uppfæra.
              </Card>
            ) : searches.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Engar leitir skráðar enn.
              </Card>
            ) : (
              <>
                {/* Quick stats row */}
                <div className="grid grid-cols-3 gap-2 mb-1">
                  {(["discount", "new", "search"] as const).map((intent) => {
                    const count = searches.filter(
                      (e) => e.meta?.intent === intent,
                    ).length;
                    const labels: Record<string, string> = {
                      discount: "Tilboð",
                      new: "Nýtt",
                      search: "Almennt",
                    };
                    return (
                      <Card
                        key={intent}
                        className="p-2 text-center"
                        data-testid={`intent-count-${intent}`}
                      >
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {labels[intent]}
                        </p>
                      </Card>
                    );
                  })}
                </div>

                {searches.map((ev) => (
                  <Card
                    key={String(ev.id)}
                    className="px-3 py-2.5 space-y-1"
                    data-testid={`search-row-${ev.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {ev.meta?.q
                          ? `"${ev.meta.q}"`
                          : ev.path}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {formatTime(ev.timestamp)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {ev.meta?.category && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {ev.meta.category}
                        </span>
                      )}
                      {ev.meta?.location && (
                        <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                          {ev.meta.location}
                        </span>
                      )}
                      {ev.meta?.intent && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">
                          {ev.meta.intent}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
