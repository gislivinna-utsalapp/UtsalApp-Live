// client/src/pages/Profile.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTimeRemaining } from "@/lib/utils";

type StoreInfo = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  plan?: string;
  planType?: string;
  trialEndsAt?: string | null;
  billingStatus?: string;
  billingActive?: boolean;
  createdAt?: string | null;
};

type BillingInfo = {
  plan: string | null;
  trialEndsAt: string | null;
  billingStatus: string;
  trialExpired: boolean;
  daysLeft: number | null;
  createdAt?: string | null;
};

type StorePost = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priceOriginal?: number;
  priceSale?: number;
  buyUrl?: string | null;
  images?: { url: string; alt?: string }[];
  viewCount?: number;
  endsAt?: string | null;
};

type PlanId = "basic" | "pro" | "premium";
type ProfileTab = "overview" | "offers" | "security" | "subscription";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

function getTrialLabel(trialEndsAt?: string | null) {
  if (!trialEndsAt) return null;

  const now = new Date();
  const end = new Date(trialEndsAt);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Frí prufuvika er runnin út";

  if (diffDays === 1) {
    return `Frí prufuvika: 1 dagur eftir (til ${end.toLocaleDateString("is-IS")})`;
  }

  return `Frí prufuvika: ${diffDays} dagar eftir (til ${end.toLocaleDateString(
    "is-IS",
  )})`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("is-IS");
}

function getPostTimeRemainingLabel(endsAt?: string | null): string | null {
  if (!endsAt) return null;

  const remaining = getTimeRemaining(endsAt);

  if (typeof remaining === "string") return remaining;

  if (remaining && typeof remaining === "object" && "totalMs" in remaining) {
    const { days, hours, minutes, totalMs } = remaining as {
      days: number;
      hours: number;
      minutes: number;
      totalMs: number;
    };

    if (totalMs <= 0) return "Útsölunni er lokið";
    if (days > 1) return `${days} dagar eftir af tilboðinu`;
    if (days === 1) return "1 dagur eftir af tilboðinu";
    if (hours > 0) return "Endar innan 24 klst";
    if (minutes > 0) return "Endar fljótlega";
    return "Endar fljótlega";
  }

  return null;
}

function buildImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  const u = rawUrl.trim();
  if (!u) return "";

  if (/^https?:\/\//i.test(u) || u.startsWith("data:")) return u;

  if (!API_BASE_URL) return u;

  const base = API_BASE_URL.endsWith("/")
    ? API_BASE_URL.slice(0, -1)
    : API_BASE_URL;
  const path = u.startsWith("/") ? u : `/${u}`;
  return `${base}${path}`;
}

const PLANS: {
  id: PlanId;
  name: string;
  price: string;
  description: string;
}[] = [
  {
    id: "basic",
    name: "Basic",
    price: "12.000 kr/mán",
    description: "Fyrir minni verslanir sem vilja byrja að prófa ÚtsalApp.",
  },
  {
    id: "pro",
    name: "Pro",
    price: "22.000 kr/mán",
    description: "Fyrir verslanir með reglulegar útsölur og meiri sýnileika.",
  },
  {
    id: "premium",
    name: "Premium",
    price: "32.000 kr/mán",
    description:
      "Fyrir stærri verslanir og keðjur sem vilja hámarksáhrif í ÚtsalApp.",
  },
];

export default function Profile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { authUser, isStore, isAdmin, loading, logout } = useAuth();

  const [tab, setTab] = useState<ProfileTab>("overview");

  const store = authUser?.store;

  // Billing
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);

  const [selectedPlan, setSelectedPlan] = useState<PlanId | null>(null);

  const [planSuccessMsg, setPlanSuccessMsg] = useState<string | null>(null);
  const [planErrorMsg, setPlanErrorMsg] = useState<string | null>(null);
  const [activatingPlanId, setActivatingPlanId] = useState<PlanId | null>(null);

  // Posts
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const {
    data: storePosts = [],
    isLoading: loadingPosts,
    error: postsError,
  } = useQuery<StorePost[]>({
    queryKey: ["store-posts", store?.id],
    enabled: !!store?.id,
    queryFn: async () => {
      if (!store?.id) return [];
      return apiFetch<StorePost[]>(`/api/v1/stores/${store.id}/posts`);
    },
  });

  // 👇 LÍMIR ÞETTA STRAX HÉR
  const safeStorePosts: StorePost[] = Array.isArray(storePosts)
    ? storePosts
    : Array.isArray((storePosts as any)?.posts)
      ? (storePosts as any).posts
      : [];

  useEffect(() => {
    if (!store?.id) return;

    let cancelled = false;

    async function loadBilling() {
      setBillingLoading(true);
      setBillingError(null);

      try {
        const data = await apiFetch<BillingInfo>("/api/v1/stores/me/billing");
        if (!cancelled) {
          setBilling(data);

          const backendPlan = (data.plan || "").toLowerCase();
          if (
            backendPlan === "basic" ||
            backendPlan === "pro" ||
            backendPlan === "premium"
          ) {
            setSelectedPlan(backendPlan as PlanId);
          } else {
            setSelectedPlan(null);
          }
        }
      } catch (err) {
        console.error("stores/me/billing error:", err);
        if (!cancelled) {
          setBillingError(
            "Tókst ekki að sækja stöðu áskriftar. Reyndu aftur síðar.",
          );
        }
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    }

    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [store?.id]);

  // Auth gates (ein útgáfa, ekki tvöfalt)
  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <Card className="p-4 space-y-2">
          <p className="text-sm">Hleð innskráningarstöðu…</p>
          <p className="text-xs text-muted-foreground">
            Ef þetta hangir lengi: skráðu þig út/inn eða endurhlaðiðu síðuna.
          </p>
        </Card>
      </div>
    );
  }

  if (!authUser || !isStore || !store) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <Card className="p-4 space-y-3">
          <p className="text-sm">
            Þú þarft að vera innskráður sem verslun til að sjá prófíl.
          </p>
          <Button
            onClick={() => navigate("/login")}
            variant="default"
            className="text-sm"
          >
            Skrá inn
          </Button>
        </Card>
      </div>
    );
  }

  const trialActive =
    billing !== null && !billing.trialExpired && !!billing.trialEndsAt;

  const trialLabel =
    billing && billing.trialExpired
      ? "Frí prufuvika er runnin út"
      : billing && billing.trialEndsAt && !billing.trialExpired
        ? getTrialLabel(billing.trialEndsAt)
        : null;

  const activePlan: PlanId | null =
    billing &&
    typeof billing.plan === "string" &&
    ["basic", "pro", "premium"].includes(billing.plan.toLowerCase())
      ? (billing.plan.toLowerCase() as PlanId)
      : null;

  const displayPlan: PlanId | null = activePlan ?? selectedPlan ?? null;

  const billingLabel =
    billing?.billingStatus ||
    store?.billingStatus ||
    (store?.billingActive ? "active" : "trial");

  const mainButtonDisabled =
    !selectedPlan || billingLoading || !!activatingPlanId;

  const mainButtonLabel = !selectedPlan
    ? "Veldu áskriftarleið til að byrja fríviku"
    : trialActive
      ? "Uppfæra í þennan pakka"
      : "Virkja fríviku á þessum pakka";

  const canCreateOffers = billing
    ? !billing.trialExpired && !!billing.trialEndsAt
    : false;

  const createdAtLabel = formatDate(
    store?.createdAt ?? billing?.createdAt ?? null,
  );

  // KPI fyrir yfirlit
  const kpi = useMemo(() => {
    const now = Date.now();

    const activeCount = safeStorePosts.filter((p) => {
      if (!p.endsAt) return true;
      const end = new Date(p.endsAt).getTime();
      return Number.isFinite(end) ? end > now : true;
    }).length;

    const views = safeStorePosts.reduce(
      (sum, p) => sum + (typeof p.viewCount === "number" ? p.viewCount : 0),
      0,
    );

    return {
      activeOffersCount: activeCount,
      totalViews: views,
    };
  }, [safeStorePosts]);

  const { activeOffersCount, totalViews } = kpi;

  // --- ACTIVATE PLAN HANDLER (VERÐUR AÐ VERA HEILT FALL) ---
  const handleActivatePlan = async () => {
    if (!store?.id) return;
    if (!selectedPlan) return;

    setPlanErrorMsg(null);
    setPlanSuccessMsg(null);
    setActivatingPlanId(selectedPlan);

    try {
      await apiFetch<StoreInfo>("/api/v1/stores/activate-plan", {
        method: "POST",
        body: JSON.stringify({ plan: selectedPlan }),
      });

      const updatedBilling = await apiFetch<BillingInfo>(
        "/api/v1/stores/me/billing",
      );
      setBilling(updatedBilling);

      const planName =
        PLANS.find((p) => p.id === selectedPlan)?.name || "pakkann";

      if (trialActive) {
        setPlanSuccessMsg(`Pakkinn þinn hefur verið uppfærður í ${planName}.`);
      } else {
        setPlanSuccessMsg(
          `Frívika þín hefur verið virkjuð í ${planName} pakka.`,
        );
      }
    } catch (err) {
      console.error("activate-plan error:", err);

      let msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að virkja eða uppfæra pakka. Reyndu aftur síðar.";

      const match = msg.match(/\{.*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.message) msg = parsed.message;
        } catch {
          // no-op
        }
      }

      setPlanErrorMsg(msg);
    } finally {
      setActivatingPlanId(null);
    }
  };

  // --- DELETE POST HANDLER (ÓBREYTT) ---
  async function handleDeletePost(post: StorePost) {
    if (!post.id) return;

    setDeleteError(null);

    const title = post.title || "tilboði";
    const confirmed = window.confirm(
      `Ertu viss um að þú viljir eyða tilboðinu „${title}“?`,
    );
    if (!confirmed) return;

    try {
      setDeletingPostId(post.id);
      await apiFetch<{ success: boolean }>(`/api/v1/posts/${post.id}`, {
        method: "DELETE",
      });

      await queryClient.invalidateQueries({
        queryKey: ["store-posts", store?.id],
      });
    } catch (err) {
      console.error("delete post error:", err);
      setDeleteError(
        "Tókst ekki að eyða tilboðinu. Reyndu aftur eða hafðu samband ef vandinn heldur áfram.",
      );
    } finally {
      setDeletingPostId(null);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    setPwError(null);
    setPwSuccess(null);

    if (!currentPassword.trim()) {
      setPwError("Vantar núverandi lykilorð.");
      return;
    }
    if (newPassword.trim().length < 8) {
      setPwError("Nýtt lykilorð þarf að vera að minnsta kosti 8 stafir.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwError("Staðfesting á nýju lykilorði passar ekki.");
      return;
    }
    if (currentPassword === newPassword) {
      setPwError("Nýtt lykilorð má ekki vera það sama og núverandi.");
      return;
    }

    setPwLoading(true);
    try {
      // ATH: Þessi route þarf að vera til í backend (ég get lagað hana þegar þú vilt)
      await apiFetch<{ success: boolean; message?: string }>(
        "/api/v1/stores/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        },
      );

      setPwSuccess("Lykilorð uppfært.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      console.error("change-password error:", err);
      let msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að breyta lykilorði. Reyndu aftur síðar.";

      const match = msg.match(/\{.*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          if (parsed.message) msg = parsed.message;
        } catch {
          // no-op
        }
      }

      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }

  function handleLogout() {
    logout();
    // React-safe logout redirect
    window.location.hash = "#/login";
  }

  const tabButtonClass = (isActive: boolean) =>
    `text-xs px-3 py-2 rounded-md border transition-colors ${
      isActive
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background hover:bg-muted border-border"
    }`;

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4 space-y-4">
      {/* Haus */}
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Prófíll verslunar</h1>
          <p className="text-xs text-muted-foreground">
            Innskráður sem {authUser.user.email} (verslun)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate("/admin")}
            >
              Admin
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={handleLogout}
          >
            Útskrá
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={tabButtonClass(tab === "overview")}
            onClick={() => setTab("overview")}
          >
            Yfirlit
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "offers")}
            onClick={() => setTab("offers")}
          >
            Mín tilboð
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "security")}
            onClick={() => setTab("security")}
          >
            Öryggi
          </button>
          <button
            type="button"
            className={tabButtonClass(tab === "subscription")}
            onClick={() => setTab("subscription")}
          >
            Áskrift
          </button>
        </div>
      </Card>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <>
          <Card className="p-4 space-y-2">
            <h2 className="text-sm font-semibold mb-1">Verslun</h2>
            <p className="text-sm">
              <span className="font-medium">Nafn:</span> {store.name}
            </p>

            {store.address && (
              <p className="text-sm">
                <span className="font-medium">Heimilisfang:</span>{" "}
                {store.address}
              </p>
            )}

            {store.phone && (
              <p className="text-sm">
                <span className="font-medium">Sími:</span> {store.phone}
              </p>
            )}

            {store.website && (
              <p className="text-sm">
                <span className="font-medium">Vefsíða:</span>{" "}
                <a
                  href={store.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  {store.website}
                </a>
              </p>
            )}

            {createdAtLabel && (
              <p className="text-sm">
                <span className="font-medium">Stofnað í ÚtsalApp:</span>{" "}
                {createdAtLabel}
              </p>
            )}
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Yfirlit</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">Virk tilboð</p>
                <p className="text-lg font-semibold">{activeOffersCount}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">
                  Heildarskoðanir
                </p>
                <p className="text-lg font-semibold">{totalViews}</p>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground">
                  Valinn pakki
                </p>
                <p className="text-lg font-semibold">
                  {displayPlan === "basic"
                    ? "Basic"
                    : displayPlan === "pro"
                      ? "Pro"
                      : displayPlan === "premium"
                        ? "Premium"
                        : "Enginn"}
                </p>
              </div>
            </div>

            <div className="pt-1 space-y-1 text-sm">
              {trialLabel ? (
                <p>
                  <span className="font-medium">Prufutímabil:</span>{" "}
                  {trialLabel}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Engin frívika virk. Veldu áskriftarleið í “Áskrift” tab til að
                  byrja.
                </p>
              )}

              <p>
                <span className="font-medium">Greiðslustaða:</span>{" "}
                {billingLabel}
              </p>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h2 className="text-sm font-semibold">Helstu aðgerðir</h2>
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                variant="secondary"
                className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => navigate("/create-post")}
                disabled={!canCreateOffers}
              >
                Búa til nýtt tilboð
              </Button>

              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setTab("offers")}
              >
                Skoða mín tilboð
              </Button>

              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setTab("security")}
              >
                Breyta lykilorði
              </Button>

              {!canCreateOffers && (
                <p className="text-[11px] text-muted-foreground">
                  Virkjaðu fríviku til að byrja að setja inn tilboð.
                </p>
              )}
            </div>
          </Card>
        </>
      )}

      {/* OFFERS */}
      {tab === "offers" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tilboð verslunar</h2>
            <p className="text-[11px] text-muted-foreground">
              {safeStorePosts.length} tilboð
            </p>
          </div>

          {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}

          {loadingPosts && (
            <p className="text-xs text-muted-foreground">
              Sæki tilboð verslunar…
            </p>
          )}

          {postsError && !loadingPosts && (
            <p className="text-xs text-red-600">
              Tókst ekki að sækja tilboð verslunar.
            </p>
          )}

          {!loadingPosts && !postsError && safeStorePosts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Þú ert ekki enn búinn að skrá nein tilboð. Þegar frívikan er virk,
              getur þú smellt á „Búa til nýtt tilboð“ til að byrja.
            </p>
          )}

          {!loadingPosts && !postsError && safeStorePosts.length > 0 && (
            <div className="space-y-3">
              {safeStorePosts.map((post) => {
                const firstImageUrl = buildImageUrl(
                  post.images?.[0]?.url ?? "",
                );
                const isDeleting = deletingPostId === post.id;
                const timeRemainingLabel = getPostTimeRemainingLabel(
                  post.endsAt,
                );

                return (
                  <div
                    key={post.id}
                    className="border border-gray-200 rounded-md p-3 text-sm flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => navigate(`/post/${post.id}`)}
                  >
                    {firstImageUrl && (
                      <div className="relative w-20 aspect-square overflow-hidden rounded-md flex-shrink-0 bg-muted">
                        <img
                          src={firstImageUrl}
                          alt={post.images?.[0]?.alt || post.title}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{post.title}</p>
                          {post.category && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              Flokkur: {post.category}
                            </p>
                          )}
                          {post.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2">
                              {post.description}
                            </p>
                          )}
                        </div>

                        {typeof post.viewCount === "number" && (
                          <p className="text-[11px] text-muted-foreground whitespace-nowrap text-right">
                            {post.viewCount} skoðanir
                            {timeRemainingLabel && (
                              <>
                                <br />
                                <span className="text-[10px] text-neutral-500">
                                  {timeRemainingLabel}
                                </span>
                              </>
                            )}
                          </p>
                        )}
                      </div>

                      {typeof post.viewCount !== "number" &&
                        timeRemainingLabel && (
                          <p className="text-[11px] text-neutral-500">
                            {timeRemainingLabel}
                          </p>
                        )}

                      <div className="flex items-center gap-2 text-[11px] pt-1">
                        {typeof post.priceOriginal === "number" && (
                          <span className="line-through text-muted-foreground">
                            {post.priceOriginal.toLocaleString("is-IS")} kr.
                          </span>
                        )}
                        {typeof post.priceSale === "number" && (
                          <span className="font-semibold">
                            {post.priceSale.toLocaleString("is-IS")} kr.
                          </span>
                        )}
                      </div>

                      <div className="pt-2 flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs w-full sm:w-auto"
                          disabled={isDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/edit-post/${post.id}`);
                          }}
                        >
                          Breyta tilboði
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-red-500 text-red-600 hover:bg-red-50 w-full sm:w-auto"
                          disabled={isDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePost(post);
                          }}
                        >
                          {isDeleting ? "Eyði…" : "Eyða tilboði"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* SECURITY */}
      {tab === "security" && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">Öryggi</h2>
          <p className="text-xs text-muted-foreground">
            Hér getur þú breytt lykilorði. Við mælum með að nota sterkt lykilorð
            (a.m.k. 8 stafi).
          </p>

          {pwError && <p className="text-xs text-red-600">{pwError}</p>}
          {pwSuccess && <p className="text-xs text-green-600">{pwSuccess}</p>}

          <form className="space-y-2" onSubmit={handleChangePassword}>
            <div className="space-y-1">
              <label className="text-xs font-medium">Núverandi lykilorð</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">Nýtt lykilorð</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">
                Staðfesta nýtt lykilorð
              </label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background"
                autoComplete="new-password"
              />
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                variant="default"
                className="w-full text-xs disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={pwLoading}
              >
                {pwLoading ? "Uppfæri…" : "Breyta lykilorði"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* SUBSCRIPTION */}
      {tab === "subscription" && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Pakkar og frívika</h2>
          </div>

          {billingLoading && (
            <p className="text-xs text-muted-foreground">
              Sæki stöðu áskriftar…
            </p>
          )}

          {billingError && (
            <p className="text-xs text-red-600">{billingError}</p>
          )}

          {!billingLoading && !billingError && !trialActive && (
            <p className="text-xs text-muted-foreground">
              Veldu pakka sem hentar versluninni þinni. Smelltu svo á hnappinn
              hér fyrir neðan til að virkja 7 daga fríviku á valda áskrift.
            </p>
          )}

          {!billingLoading && !billingError && trialActive && activePlan && (
            <p className="text-xs text-[#059669]">
              Frí prufuvika er virk á pakkann{" "}
              <span className="font-medium">
                {activePlan === "basic"
                  ? "Basic"
                  : activePlan === "pro"
                    ? "Pro"
                    : "Premium"}
              </span>
              .
            </p>
          )}

          {planErrorMsg && (
            <p className="text-xs text-red-600">{planErrorMsg}</p>
          )}

          {planSuccessMsg && (
            <p className="text-xs text-green-600">{planSuccessMsg}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              const isActive = activePlan === plan.id;
              const isActivating = activatingPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`border rounded-lg p-3 text-xs flex flex-col gap-2 cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-semibold">{plan.name}</h3>
                    <span className="font-bold">{plan.price}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {plan.description}
                  </p>
                  {isSelected && (
                    <p className="text-[11px] text-primary font-medium">
                      Valin áskriftarleið
                    </p>
                  )}
                  {isActive && trialActive && (
                    <p className="text-[11px] text-[#059669] font-medium">
                      Frívika virk á þessum pakka
                    </p>
                  )}
                  {isActivating && (
                    <p className="text-[11px] text-muted-foreground">
                      Uppfæri pakka…
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-2">
            <Button
              variant="default"
              className="w-full text-xs disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={mainButtonDisabled}
              onClick={handleActivatePlan}
            >
              {mainButtonLabel}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
