import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Eye,
  Search,
  Smartphone,
  MousePointerClick,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Summary = {
  total_events: number;
  unique_sessions: number;
  top_paths: { path: string; count: number }[];
  by_event_type: { event_type: string; count: number }[];
  recent_searches: { q: string; count: number }[];
};

type PwaInstalls = { total: number };

type AdminStore = { id: string; name: string; plan: string };

type StoreAnalytics = {
  summary: {
    totalImpressions: number;
    totalClicks: number;
    ctr: number;
  };
  posts: {
    id: string;
    title: string;
    impressions: number;
    clicks: number;
    ctr: number;
  }[];
};

// ─── Date range ───────────────────────────────────────────────────────────────

type Range = "today" | "yesterday" | "7d" | "30d" | "all";

const RANGE_LABELS: Record<Range, string> = {
  today: "Í dag",
  yesterday: "Í gær",
  "7d": "7 dagar",
  "30d": "30 dagar",
  all: "Allt",
};

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function rangeToParams(range: Range): { since?: string; until?: string } {
  const now = new Date();
  if (range === "today") return { since: toDateStr(now) };
  if (range === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { since: toDateStr(y), until: toDateStr(now) };
  }
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return { since: toDateStr(d) };
  }
  if (range === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return { since: toDateStr(d) };
  }
  return {};
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

function isUserPath(path: string): boolean {
  const clean = path.replace(/^\/api\/v1/, "");
  if (!/^\/(posts|stores)/.test(clean)) return false;
  if (/admin|analytics|auth|me\/analytics/.test(clean)) return false;
  return true;
}

function pathLabel(path: string): string {
  const clean = path.replace(/^\/api\/v1/, "").split("?")[0];
  if (/^\/posts\/[^/]+$/.test(clean)) return "Skoðaði tilboð";
  if (/^\/posts/.test(clean)) return "Forsíða / tilboðalisti";
  if (/^\/stores\/[^/]+\/posts/.test(clean)) return "Verslunarfærslur";
  if (/^\/stores\/[^/]+$/.test(clean)) return "Skoðaði verslun";
  if (/^\/stores/.test(clean)) return "Verslunaryfirlit";
  return clean;
}

function pathToFrontendUrl(path: string): string | null {
  const clean = path.replace(/^\/api\/v1/, "").split("?")[0];
  const postM = clean.match(/^\/posts\/([^/]+)$/);
  if (postM) return `/post/${postM[1]}`;
  if (/^\/posts$/.test(clean)) return "/";
  const storeM = clean.match(/^\/stores\/([^/]+)$/);
  if (storeM) return `/store/${storeM[1]}`;
  if (/^\/stores$/.test(clean)) return "/stores";
  return null;
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: string;
}) {
  const color = accent ?? "#ff4d00";
  return (
    <Card className="p-4 flex items-center gap-3">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1a` }}
      >
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-2xl font-bold leading-tight">{value}</p>
      </div>
    </Card>
  );
}

// ─── StoreRow ─────────────────────────────────────────────────────────────────

function StoreRow({ store }: { store: AdminStore }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<StoreAnalytics>({
    queryKey: ["store-analytics", store.id],
    enabled: open,
    queryFn: () => apiFetch<StoreAnalytics>(`/api/v1/admin/analytics/store/${store.id}`),
  });

  return (
    <div className="border-b last:border-0">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors text-left"
        data-testid={`button-store-${store.id}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
            style={{ background: "#ff4d00" }}
          >
            {store.name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold">{store.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{store.plan}</p>
          </div>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : data ? (
            <>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Birtingar", value: data.summary.totalImpressions },
                  { label: "Smellir", value: data.summary.totalClicks },
                  {
                    label: "CTR",
                    value: `${data.summary.ctr}%`,
                    highlight: data.summary.ctr >= 1,
                  },
                ].map((s) => (
                  <div key={s.label} className="text-center p-2 bg-muted/50 rounded-lg">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</p>
                    <p
                      className="text-lg font-bold"
                      style={s.highlight ? { color: "#ff4d00" } : {}}
                    >
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {data.posts.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">
                    Tilboð
                  </p>
                  {data.posts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center gap-2 py-2 border-b last:border-0"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.impressions} birtingar · {post.clicks} smellir
                          {post.impressions > 0 && ` · ${post.ctr}% CTR`}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/post/${post.id}`);
                        }}
                        className="p-1.5 rounded hover:bg-muted transition-colors flex-shrink-0"
                        data-testid={`button-post-open-${post.id}`}
                        title="Opna tilboð"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Engin tilboð skráð.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Villa við að sækja gögn.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  // ALL hooks must be called before any early return
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("today");

  const { since, until } = rangeToParams(range);
  const qs = [since && `since=${since}`, until && `until=${until}`]
    .filter(Boolean)
    .join("&");
  const summaryUrl = `/api/v1/admin/analytics/summary${qs ? `?${qs}` : ""}`;

  const { data: summary, isLoading } = useQuery<Summary>({
    queryKey: ["analytics-summary", range],
    enabled: isAdmin && !authLoading,
    queryFn: () => apiFetch<Summary>(summaryUrl),
    refetchInterval: 60_000,
  });

  const { data: pwa } = useQuery<PwaInstalls>({
    queryKey: ["analytics-pwa"],
    enabled: isAdmin && !authLoading,
    queryFn: () => apiFetch<PwaInstalls>("/api/v1/admin/analytics/pwa-installs"),
  });

  const { data: stores } = useQuery<AdminStore[]>({
    queryKey: ["admin-stores"],
    enabled: isAdmin && !authLoading,
    queryFn: () => apiFetch<AdminStore[]>("/api/v1/admin/stores"),
  });

  // Early returns after all hooks
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

  // Count page views from top_paths (robust: works even if event_type is
  // misclassified as api_request on older server versions)
  const pageViews = (summary?.top_paths ?? [])
    .filter((p) => isUserPath(p.path))
    .reduce((sum, p) => sum + p.count, 0) ||
    (summary?.by_event_type?.find((e) => e.event_type === "page_view")?.count ?? 0);

  const searches =
    (summary?.by_event_type?.find((e) => e.event_type === "search")?.count ?? 0) ||
    (summary?.recent_searches?.reduce((s, r) => s + r.count, 0) ?? 0);
  const sessions = summary?.unique_sessions ?? 0;

  const userPaths = (summary?.top_paths ?? [])
    .filter((p) => isUserPath(p.path))
    .slice(0, 10);
  const maxCount = userPaths[0]?.count ?? 1;

  return (
    <div className="min-h-screen bg-background pb-20">
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

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Date range tabs */}
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
            <button
              key={r}
              data-testid={`button-range-${r}`}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                range === r
                  ? "text-white"
                  : "bg-muted text-muted-foreground"
              }`}
              style={range === r ? { background: "#ff4d00" } : {}}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {/* Stat cards */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Eye} label="Heimsóknir" value={pageViews} />
            <StatCard icon={Users} label="Einstaklingar" value={sessions} accent="#6366f1" />
            <StatCard icon={Search} label="Leitir" value={searches} accent="#0ea5e9" />
            <StatCard
              icon={Smartphone}
              label="Sett á heimaskjá"
              value={pwa?.total ?? 0}
              accent="#10b981"
            />
          </div>
        )}

        {/* Top paths */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <TrendingUp className="w-4 h-4" style={{ color: "#ff4d00" }} />
            <h2 className="text-sm font-semibold">Vinsælustu slóðir</h2>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : userPaths.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              Engar slóðir skráðar á þessu tímabili.
            </p>
          ) : (
            <div className="divide-y">
              {userPaths.map((row) => {
                const label = pathLabel(row.path);
                const url = pathToFrontendUrl(row.path);
                const shortPath = row.path.replace("/api/v1", "").split("?")[0];
                return (
                  <div key={row.path} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {shortPath}
                      </p>
                      <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(row.count / maxCount) * 100}%`,
                            background: "#ff4d00",
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm font-bold">{row.count}</span>
                      {url && (
                        <button
                          onClick={() => navigate(url)}
                          className="p-1.5 rounded hover:bg-muted transition-colors"
                          data-testid={`button-open-path`}
                          title="Opna síðu"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Stores */}
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2">
            <MousePointerClick className="w-4 h-4" style={{ color: "#ff4d00" }} />
            <h2 className="text-sm font-semibold">Verslanir</h2>
          </div>

          {!stores ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : stores.length === 0 ? (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">
              Engar verslanir skráðar.
            </p>
          ) : (
            stores.map((store) => <StoreRow key={store.id} store={store} />)
          )}
        </Card>
      </div>
    </div>
  );
}
