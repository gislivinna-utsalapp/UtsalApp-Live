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
  Building2,
  Megaphone,
  Copy,
  CheckCheck,
  Tag,
  ShoppingBag,
  Store,
  X,
  BarChart,
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

type Tab = "overview" | "events" | "searches" | "sales" | "ads" | "stores";

type AdminStore = {
  id: string;
  name: string;
  email: string | null;
  plan: string;
  billingStatus: string;
  createdAt: string | null;
};

type StoreAnalytics = {
  store: AdminStore;
  summary: {
    postCount: number;
    totalPostViews: number;
    totalImpressions: number;
    totalClicks: number;
    storePageViews: number;
    ctr: number;
  };
  posts: {
    id: string;
    title: string;
    viewCount: number;
    impressions: number;
    clicks: number;
    endsAt: string | null;
    priceSale: number | null;
    priceOriginal: number | null;
  }[];
};

type AdStat = {
  postId: string;
  postTitle: string;
  storeName: string;
  impressions: number;
  clicks: number;
  ctr: number;
  firstSeen: string | null;
  lastSeen: string | null;
};

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

function PitchCopyCard({
  sessions,
  interactions,
  searchCount,
  topTerm,
}: {
  sessions: number;
  interactions: number;
  searchCount: number;
  topTerm: string | null;
}) {
  const [copied, setCopied] = useState(false);

  const pitchText = `Kæri viðskiptavinur,

ÚtsalApp er íslenska útsöluappið þar sem neytendur leita að bestu tilboðunum í verslunum um allt land.

Gögn frá appinu:
• ${sessions} einstakar notendur hafa notað appið
• ${interactions} heildarsamskipti við appið
• ${searchCount} leitir skráðar — við vitum hvað neytendur eru að leita að
${topTerm ? `• Vinsælasta leitarorðið: „${topTerm}"` : ""}

Með því að birta útsölurnar þínar á ÚtsalApp nærðu til þeirra ${sessions} notenda sem eru nú þegar að leita að tilboðum.

Við bjóðum upp á þrjá pakka: Basic, Pro og Premium.
Við getum rætt frekar um hvað hentar þér best.

Kveðja,
ÚtsalApp teymið`;

  const copy = () => {
    navigator.clipboard.writeText(pitchText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold">Tilbúið sölupostr</h3>
            <p className="text-[10px] text-muted-foreground">Afritaðu og sendu beint til hugsanlegs viðskiptavinar</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
          {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Afritað!" : "Afrita"}
        </Button>
      </div>
      <pre className="text-xs text-muted-foreground bg-muted rounded-md p-3 whitespace-pre-wrap font-sans leading-relaxed">
        {pitchText}
      </pre>
    </Card>
  );
}

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

// ─── AdRow ────────────────────────────────────────────────────────────────────

function AdRow({ ad, sessions }: { ad: AdStat; sessions: number }) {
  const [copied, setCopied] = useState(false);

  const reportText = `AUGLÝSINGARSKÝRSLA — ÚtsalApp
════════════════════════════════

Tilboð: ${ad.postTitle}
Verslun: ${ad.storeName}
Tímabil: ${ad.firstSeen ? new Date(ad.firstSeen).toLocaleDateString("is-IS") : "—"} – ${ad.lastSeen ? new Date(ad.lastSeen).toLocaleDateString("is-IS") : "—"}

NIÐURSTÖÐUR
───────────
Birtingar (Impressions): ${ad.impressions.toLocaleString("is-IS")}
Smellir (Clicks):        ${ad.clicks.toLocaleString("is-IS")}
Smellhlutfall (CTR):     ${ad.ctr}%

SAMHENGI
────────
Appið hefur ${sessions.toLocaleString("is-IS")} einstakar notandalotur.
${ad.impressions} af þeim notuðu sáu þetta tilboð.
${ad.ctr}% þeirra smelltu á tilboðið — sem er framúrskarandi í samanburði við meðaltal vefauglýsinga (~0.1%).

Þetta þýðir að tilboð á ÚtsalApp nær til mjög viðbragðsviljugra kaupenda.

—
Kynnt af ÚtsalApp teyminu`;

  const copy = () => {
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const ctrColor =
    ad.ctr >= 5 ? "text-green-600 font-bold" :
    ad.ctr >= 1 ? "text-[#ff4d00] font-semibold" :
    "text-muted-foreground";

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="py-2 px-2 max-w-[160px]">
        <p className="truncate font-medium text-neutral-800">{ad.postTitle}</p>
      </td>
      <td className="py-2 px-2 text-muted-foreground truncate max-w-[100px]">{ad.storeName}</td>
      <td className="py-2 px-2 text-right">{ad.impressions.toLocaleString("is-IS")}</td>
      <td className="py-2 px-2 text-right">{ad.clicks.toLocaleString("is-IS")}</td>
      <td className={`py-2 px-2 text-right ${ctrColor}`}>{ad.ctr}%</td>
      <td className="py-2 px-2 text-right">
        <button
          onClick={copy}
          title="Afrita skýrslu"
          className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-600"
          data-testid={`button-copy-report-${ad.postId}`}
        >
          {copied
            ? <><CheckCheck className="w-3 h-3 text-green-600" /> Afritað</>
            : <><Copy className="w-3 h-3" /> Skýrsla</>
          }
        </button>
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d" | "all">("all");

  const sinceDate = useMemo(() => {
    if (period === "all") return undefined;
    const d = new Date();
    d.setDate(d.getDate() - (period === "7d" ? 7 : period === "30d" ? 30 : 90));
    return d;
  }, [period]);

  const sinceParam = sinceDate ? `&since=${sinceDate.toISOString()}` : "";

  const PERIOD_LABELS: Record<string, string> = {
    "7d": "7 dagar",
    "30d": "30 dagar",
    "90d": "90 dagar",
    "all": "Allt tímabilið",
  };

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("utsalapp_token") ||
        localStorage.getItem("token") ||
        ""
      : "";
  const authHeader = { Authorization: `Bearer ${token}` };

  const {
    data: adStats = [],
    isLoading: adStatsLoading,
    isError: adStatsError,
    refetch: refetchAds,
  } = useQuery<AdStat[]>({
    queryKey: ["analytics-ads", period],
    enabled: isAdmin,
    refetchInterval: 60_000,
    retry: 8,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 15_000),
    queryFn: () =>
      apiFetch<AdStat[]>(`/api/v1/admin/analytics/ads?limit=200${sinceParam}`, {
        headers: authHeader,
      }),
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery<Summary>({
    queryKey: ["analytics-summary", period],
    enabled: isAdmin,
    refetchInterval: 30_000,
    retry: 8,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 15_000),
    queryFn: () =>
      apiFetch<Summary>(`/api/v1/admin/analytics/summary?v=1${sinceParam}`, {
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
    queryKey: ["analytics-db-events", period],
    enabled: isAdmin,
    refetchInterval: 60_000,
    retry: 8,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 15_000),
    queryFn: () =>
      apiFetch<Event[]>(`/api/v1/admin/analytics/db?limit=500${sinceParam}`, {
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
    retry: 8,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 15_000),
    queryFn: () =>
      apiFetch<Event[]>("/api/v1/admin/analytics/events?limit=200", {
        headers: authHeader,
      }),
  });

  // Merge: DB rows are authoritative; prepend any mem-only events (those without
  // a numeric id are in-memory only and not yet confirmed to be in the DB).
  // When filtering by period, skip mem-only events (they lack reliable timestamps).
  const events = useMemo<Event[]>(() => {
    if (period !== "all") return dbEvents;
    const dbIds = new Set(dbEvents.map((e) => String(e.id)));
    const memOnly = memEvents.filter(
      (e) => String(e.id).startsWith("mem-") || !dbIds.has(String(e.id)),
    );
    return [...memOnly, ...dbEvents];
  }, [dbEvents, memEvents, period]);

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

  const {
    data: adminStores = [],
    isLoading: adminStoresLoading,
    refetch: refetchAdminStores,
  } = useQuery<AdminStore[]>({
    queryKey: ["admin-stores"],
    enabled: isAdmin,
    retry: 8,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 15_000),
    queryFn: () =>
      apiFetch<AdminStore[]>("/api/v1/admin/stores", { headers: authHeader }),
  });

  const {
    data: storeAnalytics,
    isLoading: storeAnalyticsLoading,
  } = useQuery<StoreAnalytics>({
    queryKey: ["analytics-store", selectedStoreId],
    enabled: isAdmin && !!selectedStoreId,
    retry: 3,
    queryFn: () =>
      apiFetch<StoreAnalytics>(`/api/v1/admin/analytics/store/${selectedStoreId}`, {
        headers: authHeader,
      }),
  });

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
    refetchAds();
    refetchAdminStores();
  };

  // Derived stats from cached summary
  const pageViews =
    summary?.top_paths.reduce((s, r) => s + r.count, 0) ?? 0;

  const searchCount = events.filter((e) => e.event_type === "search").length;

  // Sales-tab derived data
  const topSearchTerms = summary?.recent_searches ?? [];
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    events.forEach((e) => {
      const cat = e.meta?.category;
      if (cat) cats[cat] = (cats[cat] ?? 0) + 1;
    });
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, count]) => ({ cat, count }));
  }, [events]);

  const CATEGORY_LABELS: Record<string, string> = {
    fatnad: "Fatnaður", husgogn: "Húsgögn", raftaeki: "Raftæki",
    matvorur: "Matvörur", annad: "Annað",
  };

  // Ads-tab derived stats
  const totalImpressions = adStats.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = adStats.reduce((s, a) => s + a.clicks, 0);
  const overallCtr = totalImpressions > 0
    ? Math.round((totalClicks / totalImpressions) * 1000) / 10
    : 0;
  const top5Ads = [...adStats].sort((a, b) => b.ctr - a.ctr).slice(0, 5);

  // Tabs
  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Yfirlit", icon: BarChart2 },
    { key: "ads", label: "Auglýsingar", icon: Megaphone },
    { key: "events", label: "Atburðir", icon: Clock },
    { key: "searches", label: "Leitir", icon: Search },
    { key: "sales", label: "Söluyfirlit", icon: Building2 },
    { key: "stores", label: "Verslanir", icon: Store },
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
        {/* Period selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Tímabil:</span>
          {(["7d", "30d", "90d", "all"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              data-testid={`button-period-${p}`}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                period === p
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover-elevate"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

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
              sub={PERIOD_LABELS[period]}
            />
            <StatCard
              icon={Eye}
              label="Atburðir (heildarfjöldi)"
              value={summary?.total_events ?? summary?.total_events_cached ?? 0}
              sub={PERIOD_LABELS[period]}
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

        {/* Tab bar — horizontally scrollable on mobile */}
        <div className="flex gap-0 border-b overflow-x-auto scrollbar-none -mx-4 px-4">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              data-testid={`tab-${key}`}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
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
              <Card className="p-6 text-center space-y-2">
                <p className="text-sm text-destructive">Villa við að sækja atburðagögn.</p>
                <Button size="sm" variant="outline" onClick={() => refetchEvents()}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reyna aftur
                </Button>
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
              <Card className="p-6 text-center space-y-2">
                <p className="text-sm text-destructive">Villa við að sækja leitargögn.</p>
                <Button size="sm" variant="outline" onClick={() => refetchSearches()}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reyna aftur
                </Button>
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

        {/* ── ADS TAB ──────────────────────────────────────────────────── */}
        {tab === "ads" && (
          <div className="space-y-4">

            {/* Summary row */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={Eye} label="Birtingar (total)" value={totalImpressions.toLocaleString("is-IS")} />
              <StatCard icon={MousePointerClick} label="Smellir (total)" value={totalClicks.toLocaleString("is-IS")} />
              <StatCard icon={TrendingUp} label="CTR meðaltal" value={`${overallCtr}%`} />
            </div>

            {/* Top 5 by CTR */}
            {top5Ads.length > 0 && (
              <Card className="p-4 space-y-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Top 5 auglýsingar eftir CTR
                </h2>
                <div className="space-y-2">
                  {top5Ads.map((ad, i) => (
                    <div key={ad.postId} className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{ad.postTitle}</p>
                        <p className="text-[10px] text-muted-foreground">{ad.storeName}</p>
                      </div>
                      <span className="text-sm font-bold text-[#ff4d00] flex-shrink-0">
                        {ad.ctr}%
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Full ads table */}
            <Card className="p-4 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Allar auglýsingar
                {adStats.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({adStats.length})
                  </span>
                )}
              </h2>

              {adStatsLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : adStatsError ? (
                <div className="py-4 text-center space-y-2">
                  <p className="text-sm text-destructive">Villa við að sækja auglýsingagögn.</p>
                  <Button size="sm" variant="outline" onClick={() => refetchAds()}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reyna aftur
                  </Button>
                </div>
              ) : adStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Engin gögn enn — birtingar byrja að mælast þegar notendur sjá tilboð.
                </p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs min-w-[480px]">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Tilboð</th>
                        <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Verslun</th>
                        <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Birtingar</th>
                        <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Smellir</th>
                        <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">CTR</th>
                        <th className="py-1.5 px-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {adStats.map((ad) => (
                        <AdRow key={ad.postId} ad={ad} sessions={summary?.unique_sessions ?? 0} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── SALES TAB ────────────────────────────────────────────────── */}
        {tab === "sales" && (
          <div className="space-y-4">

            {/* Explainer banner */}
            <div className="flex gap-3 p-4 rounded-md bg-primary/5 border border-primary/20">
              <Megaphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm space-y-1">
                <p className="font-semibold">Hvað þýðir þetta og hvernig sel ég þetta?</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Þessi flipi sýnir þér gögnin sem þú notar til að sanna verðmæti ÚtsalApp gagnvart verslunum.
                  Þegar þú ert að tala við hugsanlegan viðskiptavin, notar þú tölurnar hér til að sýna hve margir
                  notendur eru á appinu og hvað þeir eru að leita að — þannig getur þú sannfært þá um að birta útsölur hjá þér.
                </p>
              </div>
            </div>

            {/* Hero metrics — pitch-ready */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 space-y-1 text-center">
                <p className="text-3xl font-bold text-primary">{summary?.unique_sessions ?? "—"}</p>
                <p className="text-xs font-medium">Einstakar notandalotur</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Jafngildir „x einstakir besökare" — notaðu þessa tölu þegar þú talar við verslanir
                </p>
              </Card>
              <Card className="p-4 space-y-1 text-center">
                <p className="text-3xl font-bold text-primary">
                  {(summary?.by_event_type?.find(e => e.event_type === "page_view")?.count ?? 0) +
                   (summary?.by_event_type?.find(e => e.event_type === "api_request")?.count ?? 0)}
                </p>
                <p className="text-xs font-medium">Heildarsamskipti við app</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Sýnir hversu virkt appið er — hvert samskipti er mögulegt auga á útsölu verslunarinnar
                </p>
              </Card>
              <Card className="p-4 space-y-1 text-center">
                <p className="text-3xl font-bold text-primary">
                  {summary?.by_event_type?.find(e => e.event_type === "search")?.count ?? 0}
                </p>
                <p className="text-xs font-medium">Leitir skráðar</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Sérhver leit er kaupáhugi — þú veist hvað neytendur eru að leita að
                </p>
              </Card>
              <Card className="p-4 space-y-1 text-center">
                <p className="text-3xl font-bold text-primary">{summary?.top_paths?.length ?? 0}</p>
                <p className="text-xs font-medium">Einstaka síður skoðaðar</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Fjölbreyttar skoðanir sýna breidd notendahópsins
                </p>
              </Card>
            </div>

            {/* Search demand — the most valuable data for sales */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">Hvað eru neytendur að leita að?</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Þetta er gullið — þú getur sagt við verslun: „Við vitum að fólk er að leita að þessum vörum á appinu"
                  </p>
                </div>
              </div>
              {topSearchTerms.length === 0 ? (
                <p className="text-xs text-muted-foreground">Engar leitir enn. Þegar notendur leita birtist hér.</p>
              ) : (
                <div className="space-y-2">
                  {topSearchTerms.map((s, i) => {
                    const max = topSearchTerms[0]?.count ?? 1;
                    return (
                      <div key={s.q} className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground w-4 flex-shrink-0">#{i + 1}</span>
                        <span className="text-sm font-medium truncate w-36 flex-shrink-0">„{s.q}"</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${(s.count / max) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right flex-shrink-0">{s.count}x</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Category demand */}
            {categoryBreakdown.length > 0 && (
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  <div>
                    <h3 className="text-sm font-semibold">Vinsælustu flokkar</h3>
                    <p className="text-[10px] text-muted-foreground">Notaðu þetta þegar þú pitchar við verslun í tilteknum flokki</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryBreakdown.map(({ cat, count }) => (
                    <div key={cat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium">
                      {CATEGORY_LABELS[cat] ?? cat}
                      <span className="text-xs text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Pitch copy — ready to paste into email/pitch */}
            <PitchCopyCard
              sessions={summary?.unique_sessions ?? 0}
              interactions={(summary?.by_event_type?.find(e => e.event_type === "page_view")?.count ?? 0) +
                (summary?.by_event_type?.find(e => e.event_type === "api_request")?.count ?? 0)}
              searchCount={summary?.by_event_type?.find(e => e.event_type === "search")?.count ?? 0}
              topTerm={topSearchTerms[0]?.q ?? null}
            />
          </div>
        )}

        {/* ── STORES TAB ───────────────────────────────────────────────── */}
        {tab === "stores" && (
          <div className="space-y-3">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary" />
                  Allar verslanir ({adminStores.length})
                </h2>
                <Button size="sm" variant="outline" onClick={() => refetchAdminStores()}>
                  <RefreshCw className="w-3 h-3 mr-1.5" /> Uppfæra
                </Button>
              </div>

              {adminStoresLoading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-12 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : adminStores.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Engar verslanir skráðar enn.
                </p>
              ) : (
                <div className="space-y-1">
                  {adminStores.map((s) => {
                    const planColor =
                      s.plan === "premium" ? "bg-purple-100 text-purple-700" :
                      s.plan === "pro" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground";
                    return (
                      <button
                        key={s.id}
                        data-testid={`store-row-${s.id}`}
                        onClick={() => setSelectedStoreId(s.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover-elevate active-elevate-2 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Store className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{s.email ?? "—"}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${planColor}`}>
                          {s.plan}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 -rotate-90" />
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {/* ── STORE DETAIL MODAL ──────────────────────────────────────────── */}
      {selectedStoreId && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setSelectedStoreId(null)}
          data-testid="modal-store-detail-backdrop"
        >
          <div
            className="bg-background w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            data-testid="modal-store-detail"
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {storeAnalyticsLoading ? (
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                ) : (
                  <>
                    <p className="font-semibold text-sm truncate">
                      {storeAnalytics?.store.name ?? "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {storeAnalytics?.store.email ?? "—"}
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedStoreId(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover-elevate"
                data-testid="button-close-store-modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {storeAnalyticsLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                  ))}
                </div>
              ) : !storeAnalytics ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Engin gögn fundust.
                </p>
              ) : (
                <>
                  {/* Plan badge row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      storeAnalytics.store.plan === "premium" ? "bg-purple-100 text-purple-700" :
                      storeAnalytics.store.plan === "pro" ? "bg-blue-100 text-blue-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {storeAnalytics.store.plan}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      storeAnalytics.store.billingStatus === "active" ? "bg-green-100 text-green-700" :
                      storeAnalytics.store.billingStatus === "trial" ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {storeAnalytics.store.billingStatus}
                    </span>
                    {storeAnalytics.store.createdAt && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        Skráð: {new Date(storeAnalytics.store.createdAt).toLocaleDateString("is-IS")}
                      </span>
                    )}
                  </div>

                  {/* Summary stats grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Tilboð", value: storeAnalytics.summary.postCount, icon: Tag },
                      { label: "Skoðanir", value: storeAnalytics.summary.totalPostViews, icon: Eye },
                      { label: "Verslunar-skoðanir", value: storeAnalytics.summary.storePageViews, icon: Store },
                      { label: "Birtingar", value: storeAnalytics.summary.totalImpressions, icon: BarChart },
                      { label: "Smellir", value: storeAnalytics.summary.totalClicks, icon: MousePointerClick },
                      { label: "CTR", value: `${storeAnalytics.summary.ctr}%`, icon: TrendingUp },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="rounded-md border p-2.5 space-y-0.5">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Icon className="w-3 h-3" />
                          <span className="text-[10px]">{label}</span>
                        </div>
                        <p className="text-base font-bold">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Per-post breakdown */}
                  {storeAnalytics.posts.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Tag className="w-3 h-3" />
                        Tilboð ({storeAnalytics.posts.length})
                      </h3>
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-xs min-w-[340px]">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1.5 px-2 text-muted-foreground font-medium">Tilboð</th>
                              <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Skoð.</th>
                              <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Birtingar</th>
                              <th className="text-right py-1.5 px-2 text-muted-foreground font-medium">Smellir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {storeAnalytics.posts.map((p) => (
                              <tr key={p.id} className="border-b last:border-0">
                                <td className="py-2 px-2 max-w-[140px]">
                                  <p className="truncate font-medium">{p.title}</p>
                                  {p.priceSale != null && (
                                    <p className="text-[10px] text-primary font-semibold">
                                      {p.priceSale.toLocaleString("is-IS")} kr
                                    </p>
                                  )}
                                </td>
                                <td className="py-2 px-2 text-right">{p.viewCount}</td>
                                <td className="py-2 px-2 text-right">{p.impressions}</td>
                                <td className="py-2 px-2 text-right">{p.clicks}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {storeAnalytics.posts.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Þessi verslun hefur engin tilboð skráð.
                    </p>
                  )}

                  {/* Link to store page */}
                  <Link to={`/stores/${selectedStoreId}`}>
                    <button
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm font-medium hover-elevate active-elevate-2"
                      onClick={() => setSelectedStoreId(null)}
                    >
                      <Globe className="w-4 h-4" />
                      Skoða verslunarsíðu
                    </button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
