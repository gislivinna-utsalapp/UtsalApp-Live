import { useState, useMemo, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
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
  ChevronDown,
  ChevronUp,
  Globe,
  Filter,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Summary = {
  total_events: number;
  total_events_db: number;
  total_events_cached: number;
  unique_sessions: number;
  top_paths: { path: string; count: number }[];
  by_event_type: { event_type: string; count: number }[];
  recent_searches: { q: string; count: number }[];
};

type Event = {
  id: string | number;
  session_id: string;
  event_type: string;
  target?: string | null;
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

/** Convert raw API path → human-readable Icelandic label */
function pathLabel(path: string): string {
  const clean = path.replace(/^\/api\/v1/, "");
  if (/^\/posts\/[^/]+$/.test(clean)) return "Opnaði tilboð";
  if (/^\/posts/.test(clean)) return "Skoðaði tilboðalista";
  if (/^\/stores\/[^/]+\/posts/.test(clean)) return "Verslunarfærslur";
  if (/^\/stores\/[^/]+$/.test(clean)) return "Opnaði verslun";
  if (/^\/stores/.test(clean)) return "Verslunaryfirlit";
  if (/^\/admin\/posts/.test(clean)) return "Admin: tilboðalistinn";
  if (/^\/admin\/stores/.test(clean)) return "Admin: verslunarlistinn";
  if (/^\/admin\/analytics/.test(clean)) return "Admin: greiningar";
  if (/^\/auth\/login/.test(clean)) return "Innskráning";
  if (/^\/auth\/register/.test(clean)) return "Nýskráning";
  if (/analyze-search/.test(path)) return "Leitargreining (NLP)";
  if (/^\/uploads/.test(path)) return "Myndasækja";
  return clean || path;
}

/** Extract entity type + ID from an API path (null if not applicable) */
function extractEntity(path: string): { type: "post" | "store"; id: string } | null {
  const clean = path.replace(/^\/api\/v1/, "");
  const postMatch = clean.match(/^\/posts\/([^/?#]+)$/);
  if (postMatch) return { type: "post", id: postMatch[1] };
  const storeMatch = clean.match(/^\/stores\/([^/?#]+)(?:\/posts)?$/);
  if (storeMatch) return { type: "store", id: storeMatch[1] };
  return null;
}

/** Convert API path → frontend URL (null if no direct page) */
function pathToFrontendUrl(path: string): string | null {
  const entity = extractEntity(path);
  if (entity?.type === "post") return `/posts/${entity.id}`;
  if (entity?.type === "store") return `/stores/${entity.id}`;
  const clean = path.replace(/^\/api\/v1/, "");
  if (/^\/admin\/analytics/.test(clean)) return "/admin/analytics";
  if (/^\/admin/.test(clean)) return "/admin";
  return null;
}

/** Small component that fetches + displays entity title when an event row is expanded */
function EntityInfo({ path }: { path: string }) {
  const entity = extractEntity(path);
  const [info, setInfo] = useState<{ title: string; subtitle?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entity) return;
    setLoading(true);
    const url =
      entity.type === "post"
        ? `/api/v1/posts/${entity.id}`
        : `/api/v1/stores/${entity.id}`;
    fetch(url)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        if (entity.type === "post") {
          setInfo({
            title: data.title ?? "Óþekkt tilboð",
            subtitle: data.store?.name ?? undefined,
          });
        } else {
          setInfo({ title: data.name ?? "Óþekkt verslun" });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [path]);

  const frontendUrl = pathToFrontendUrl(path);

  if (!entity && !frontendUrl) return null;

  return (
    <div className="flex items-start gap-3 p-3 rounded-md bg-background border mt-1">
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
          {entity?.type === "post" ? "Tilboð" : entity?.type === "store" ? "Verslun" : "Síða"}
        </p>
        {loading ? (
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
        ) : info ? (
          <>
            <p className="text-sm font-semibold truncate">{info.title}</p>
            {info.subtitle && (
              <p className="text-xs text-muted-foreground">{info.subtitle}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground font-mono truncate">
            {entity?.id?.slice(0, 16)}…
          </p>
        )}
      </div>
      {frontendUrl && (
        <Link to={frontendUrl}>
          <button
            className="flex items-center gap-1 text-xs font-medium text-primary border border-primary/30 rounded px-2 py-1 flex-shrink-0 hover:bg-primary/10 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="w-3 h-3" />
            Opna
          </button>
        </Link>
      )}
    </div>
  );
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
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  // DB-backed query — persistent, full history
  const {
    data: dbEvents = [],
    isLoading: dbLoading,
    isError: dbError,
    refetch: refetchDb,
  } = useQuery<Event[]>({
    queryKey: ["analytics-db-events"],
    enabled: isAdmin,
    refetchInterval: 60_000,
    queryFn: () =>
      apiFetch<Event[]>("/api/v1/admin/analytics/db?limit=500", {
        headers: authHeader,
      }),
  });

  // In-memory query — catches events from current server session not yet deduped
  const {
    data: memEvents = [],
    isLoading: memLoading,
    refetch: refetchMem,
  } = useQuery<Event[]>({
    queryKey: ["analytics-mem-events"],
    enabled: isAdmin,
    refetchInterval: 30_000,
    queryFn: () =>
      apiFetch<Event[]>("/api/v1/admin/analytics/events?limit=200", {
        headers: authHeader,
      }),
  });

  // Merge: DB rows are authoritative; prepend any mem-only events (those without
  // a numeric id are in-memory only and not yet confirmed to be in the DB)
  const events = useMemo<Event[]>(() => {
    const dbIds = new Set(dbEvents.map((e) => String(e.id)));
    const memOnly = memEvents.filter(
      (e) => String(e.id).startsWith("mem-") || !dbIds.has(String(e.id)),
    );
    return [...memOnly, ...dbEvents];
  }, [dbEvents, memEvents]);

  const eventsLoading = dbLoading && memLoading;
  const eventsError = dbError;

  const searches = useMemo(
    () => events.filter((e) => e.event_type === "search"),
    [events],
  );

  const filteredEvents = useMemo(
    () => eventFilter === "all" ? events : events.filter((e) => e.event_type === eventFilter),
    [events, eventFilter],
  );

  const searchesLoading = eventsLoading;
  const refetchEvents = () => { refetchDb(); refetchMem(); };
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
    refetchEvents();
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
              sub="allt frá upphafi"
            />
            <StatCard
              icon={Eye}
              label="Atburðir (heildarfjöldi)"
              value={summary?.total_events ?? summary?.total_events_cached ?? 0}
              sub="í gagnagrunni"
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
          <div className="space-y-3">
            <Card className="p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                Vinsælustu slóðirnar
              </h2>
              {summaryLoading ? (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-5 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : summary?.top_paths.length ? (
                <TopPathsTable paths={summary.top_paths} />
              ) : (
                <p className="text-sm text-muted-foreground">Engin gögn enn.</p>
              )}
            </Card>

            {/* Event type breakdown */}
            {summary?.by_event_type?.length ? (
              <Card className="p-4 space-y-2">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <MousePointerClick className="w-4 h-4 text-primary" />
                  Atburðir eftir tegund
                </h2>
                <div className="flex flex-wrap gap-2">
                  {summary.by_event_type.map((et) => (
                    <div
                      key={et.event_type}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${eventTypeBadgeClass(et.event_type)}`}
                    >
                      {eventTypeLabel(et.event_type)}
                      <span className="font-bold">{et.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            {/* Recent search terms */}
            {summary?.recent_searches?.length ? (
              <Card className="p-4 space-y-2">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  Vinsælustu leitarorðin
                </h2>
                <div className="space-y-1.5">
                  {summary.recent_searches.map((s) => {
                    const max = summary.recent_searches[0]?.count ?? 1;
                    return (
                      <div key={s.q} className="flex items-center gap-2">
                        <span className="text-xs truncate w-40 flex-shrink-0 font-medium">
                          "{s.q}"
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(s.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-6 text-right flex-shrink-0">
                          {s.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ) : null}
          </div>
        )}

        {/* ── EVENTS TAB ───────────────────────────────────────────────── */}
        {tab === "events" && (
          <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              {(["all", "page_view", "search", "api_request"] as const).map((f) => {
                const labels: Record<string, string> = {
                  all: "Allt",
                  page_view: "Síðuskoðun",
                  search: "Leit",
                  api_request: "API",
                };
                const active = eventFilter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setEventFilter(f)}
                    data-testid={`filter-${f}`}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {labels[f]}
                    {f === "all" && events.length > 0 && (
                      <span className="ml-1 opacity-70">{events.length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {eventsLoading ? (
              [...Array(5)].map((_, i) => (
                <Card key={i} className="h-14 animate-pulse bg-muted" />
              ))
            ) : eventsError ? (
              <Card className="p-6 text-center text-sm text-destructive">
                Villa við að sækja gögn. Reyndu að uppfæra.
              </Card>
            ) : filteredEvents.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                {eventFilter === "all" ? "Engir atburðir skráðir enn." : `Engir „${eventFilter}" atburðir.`}
              </Card>
            ) : (
              filteredEvents.map((ev) => {
                const id = String(ev.id);
                const isOpen = expandedId === id;
                const label = pathLabel(ev.path);
                const query = ev.meta?.q ?? ev.target;
                return (
                  <Card
                    key={id}
                    data-testid={`event-row-${ev.id}`}
                    className="overflow-hidden cursor-pointer hover-elevate"
                    onClick={() => setExpandedId(isOpen ? null : id)}
                  >
                    {/* Collapsed row */}
                    <div className="px-3 py-2.5 flex items-center gap-3">
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${eventTypeBadgeClass(ev.event_type)}`}
                      >
                        {eventTypeLabel(ev.event_type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        {query && (
                          <p className="text-xs text-muted-foreground truncate">
                            Leitarorð: „{query}"
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block">
                          {formatTime(ev.timestamp)}
                        </span>
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                          : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        }
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isOpen && (
                      <div className="border-t bg-muted/40 px-3 py-3 space-y-3 text-xs">
                        {/* Entity link card — fetches title automatically */}
                        <EntityInfo path={ev.path} />

                        {/* Search term highlight */}
                        {(ev.meta?.q || ev.target) && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                            <Search className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                            <span className="text-purple-800 dark:text-purple-200 font-medium">
                              Leitarorð: „{ev.meta?.q ?? ev.target}"
                            </span>
                          </div>
                        )}

                        {/* Metadata grid */}
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                          <span className="text-muted-foreground">Tími</span>
                          <span className="font-mono">{new Date(ev.timestamp).toLocaleString("is-IS")}</span>

                          <span className="text-muted-foreground">Aðferð</span>
                          <span className="font-mono">{ev.method}</span>

                          <span className="text-muted-foreground">Lota</span>
                          <span className="font-mono text-[10px] opacity-70">{ev.session_id.slice(0, 18)}…</span>

                          <span className="text-muted-foreground">Slóð</span>
                          <span className="font-mono text-[10px] break-all opacity-70">{ev.path}</span>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })
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
                        {ev.meta?.q || ev.target
                          ? `"${ev.meta?.q ?? ev.target}"`
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
