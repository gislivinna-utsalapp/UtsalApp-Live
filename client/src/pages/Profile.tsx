// client/src/pages/Profile.tsx

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SalePostWithDetails } from "@shared/schema";
import { formatPrice, calculateDiscount, getTimeRemaining } from "@/lib/utils";

const TOKEN_KEY = "utsalapp_token";
const AUTH_KEY = "utsalapp_auth_user";

type PlanType = "basic" | "pro" | "premium";

type StoreTrial = {
  trialEndsAt: string | null;
  daysLeft: number | null;
  isExpired: boolean;
};

type StoreFromApi = {
  id: string;
  name: string;
  plan?: PlanType;
  planType?: PlanType;
  billingStatus?: "trial" | "active" | "paused" | "canceled";
  billingActive?: boolean;
  trial?: StoreTrial;
  trialEndsAt?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  [key: string]: any;
};

export default function Profile() {
  const { authUser, logout, loading } = useAuth();

  const [posts, setPosts] = useState<SalePostWithDetails[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Frívika / pakkar
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("basic");
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [showPlanEditor, setShowPlanEditor] = useState(false);

  // Trial / billing staða úr backend
  const [storeStatus, setStoreStatus] = useState<StoreFromApi | null>(null);
  const [storeStatusLoading, setStoreStatusLoading] = useState(false);
  const [storeStatusError, setStoreStatusError] = useState<string | null>(null);

  // Upphafsstilla valinn pakka út frá store.planType þegar authUser er til
  useEffect(() => {
    const plan = (authUser?.store as any)?.planType as PlanType | undefined;
    if (plan === "basic" || plan === "pro" || plan === "premium") {
      setSelectedPlan(plan);
    }
  }, [authUser?.store]);

  // Sækja tilboð verslunarinnar þegar við vitum store.id
  useEffect(() => {
    async function fetchStorePosts() {
      if (!authUser?.store?.id) return;

      setPostsLoading(true);
      setPostsError(null);

      try {
        const res = await fetch(
          `/api/v1/stores/${authUser.store.id}/posts?activeOnly=false`,
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Tókst ekki að sækja tilboð verslunar.");
        }

        const data = (await res.json()) as SalePostWithDetails[];
        setPosts(data);
      } catch (err: any) {
        console.error("Fetch store posts error:", err);
        setPostsError(
          err?.message || "Villa kom upp við að sækja tilboð verslunar.",
        );
      } finally {
        setPostsLoading(false);
      }
    }

    fetchStorePosts();
  }, [authUser?.store?.id]);

  // Sækja trial/billing stöðu verslunar úr backend (/api/v1/store/me)
  useEffect(() => {
    async function fetchStoreStatus() {
      if (!authUser?.user || authUser.user.role !== "store") return;

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return;

      setStoreStatusLoading(true);
      setStoreStatusError(null);

      try {
        const res = await fetch("/api/v1/store/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const text = await res.text().catch(() => "");
        let data: any = null;
        try {
          data = text ? JSON.parse(text) : null;
        } catch {
          data = null;
        }

        if (!res.ok) {
          throw new Error(
            data?.message ||
              text ||
              "Tókst ekki að sækja upplýsingar um verslun og áskrift.",
          );
        }

        if (!data || typeof data !== "object") {
          setStoreStatus(null);
          return;
        }

        setStoreStatus(data as StoreFromApi);

        const planFromApi =
          (data.planType as PlanType | undefined) ??
          (data.plan as PlanType | undefined);
        if (
          planFromApi === "basic" ||
          planFromApi === "pro" ||
          planFromApi === "premium"
        ) {
          setSelectedPlan(planFromApi);
        }
      } catch (err: any) {
        console.error("Fetch store status error:", err);
        setStoreStatusError(
          err?.message ||
            "Villa kom upp við að sækja upplýsingar um verslun og áskrift.",
        );
      } finally {
        setStoreStatusLoading(false);
      }
    }

    fetchStoreStatus();
  }, [authUser?.user?.id, authUser?.user?.role]);

  // Eyða tilboði
  async function handleDelete(postId: string) {
    if (!authUser?.store?.id) return;

    const sure = window.confirm(
      "Ertu viss um að þú viljir eyða þessu tilboði? Þessu verður ekki hægt að afturkalla.",
    );
    if (!sure) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setPostsError(
        "Enginn innskráningarlykill fannst. Reyndu að skrá þig inn aftur.",
      );
      return;
    }

    setDeletingId(postId);
    setPostsError(null);

    try {
      const res = await fetch(`/api/v1/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Tókst ekki að eyða tilboði.");
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err: any) {
      console.error("Delete post error:", err);
      setPostsError(err?.message || "Villa kom upp við að eyða tilboði.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleActivatePlan() {
    if (!authUser?.store?.id) return;

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setPlanError(
        "Enginn innskráningarlykill fannst. Reyndu að skrá þig inn aftur.",
      );
      return;
    }

    setPlanLoading(true);
    setPlanError(null);

    try {
      const res = await fetch("/api/v1/stores/activate-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planType: selectedPlan, plan: selectedPlan }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Tókst ekki að virkja pakka.");
      }

      try {
        const stored = localStorage.getItem(AUTH_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          const storeLocal = parsed.store || {};
          storeLocal.planType = data?.planType ?? selectedPlan;
          storeLocal.trialEndsAt =
            data?.trialEndsAt ?? data?.trial?.trialEndsAt ?? null;
          storeLocal.billingActive =
            data?.billingActive ??
            (data?.billingStatus === "active" ? true : true);
          parsed.store = storeLocal;
          localStorage.setItem(AUTH_KEY, JSON.stringify(parsed));
        }
      } catch (e) {
        console.error("Gat ekki uppfært AUTH_KEY eftir activate-plan", e);
      }

      window.location.reload();
    } catch (err: any) {
      console.error("activate plan error:", err);
      setPlanError(err?.message || "Villa kom upp við að virkja pakka.");
    } finally {
      setPlanLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Hleð prófíl...</div>
    );
  }

  if (!authUser) {
    return (
      <div className="p-4 space-y-4">
        <h2 className="text-xl font-bold">Prófíll</h2>
        <p className="text-sm text-muted-foreground">Þú ert ekki innskráður.</p>

        <Link to="/login">
          <Button className="w-full">Skrá inn</Button>
        </Link>

        <Link to="/register-store">
          <Button className="w-full mt-2" variant="secondary">
            Stofna verslun
          </Button>
        </Link>
      </div>
    );
  }

  const user = authUser.user;
  const store = authUser.store as any;

  const effectiveStore: StoreFromApi | null = storeStatus
    ? { ...(storeStatus as any) }
    : store
      ? { ...(store as any) }
      : null;

  const trial: StoreTrial | null =
    effectiveStore?.trial ??
    (effectiveStore?.trialEndsAt || store?.trialEndsAt
      ? {
          trialEndsAt:
            effectiveStore?.trialEndsAt ??
            (store?.trialEndsAt as string | null) ??
            null,
          daysLeft: null,
          isExpired: false,
        }
      : null);

  const billingActive: boolean = (() => {
    if (!effectiveStore) return false;

    if (effectiveStore.billingStatus === "active") return true;

    if (trial && trial.trialEndsAt && trial.isExpired === false) {
      return true;
    }

    if (typeof effectiveStore.billingActive === "boolean") {
      return effectiveStore.billingActive;
    }

    return false;
  })();

  const currentPlan: PlanType =
    (effectiveStore?.planType as PlanType | undefined) ??
    (effectiveStore?.plan as PlanType | undefined) ??
    "basic";

  const trialEndsAt =
    trial?.trialEndsAt ??
    (effectiveStore?.trialEndsAt as string | null | undefined) ??
    (store?.trialEndsAt as string | null | undefined) ??
    null;

  const storeAddress =
    effectiveStore?.address ?? (store?.address as string | undefined);
  const storePhone =
    effectiveStore?.phone ?? (store?.phone as string | undefined);
  const storeWebsite =
    effectiveStore?.website ?? (store?.website as string | undefined);

  function formatPlanLabel(plan: PlanType) {
    if (plan === "basic") return "Basic";
    if (plan === "pro") return "Pro";
    return "Premium";
  }

  const renderPlanChoices = (
    onClickPlan: (p: PlanType) => void,
    currentSelected: PlanType,
  ) => (
    <div className="flex flex-col md:flex-row gap-2 text-sm">
      <button
        type="button"
        className={`flex-1 border rounded p-2 text-left ${
          currentSelected === "basic" ? "border-pink-600" : "border-border"
        }`}
        onClick={() => onClickPlan("basic")}
      >
        <div className="font-semibold">Basic</div>
        <div className="text-xs text-muted-foreground">
          Fyrir minni verslanir með einföld tilboð.
        </div>
      </button>

      <button
        type="button"
        className={`flex-1 border rounded p-2 text-left ${
          currentSelected === "pro" ? "border-pink-600" : "border-border"
        }`}
        onClick={() => onClickPlan("pro")}
      >
        <div className="font-semibold">Pro</div>
        <div className="text-xs text-muted-foreground">
          Fyrir verslanir með reglulegar útsölur.
        </div>
      </button>

      <button
        type="button"
        className={`flex-1 border rounded p-2 text-left ${
          currentSelected === "premium" ? "border-pink-600" : "border-border"
        }`}
        onClick={() => onClickPlan("premium")}
      >
        <div className="font-semibold">Premium</div>
        <div className="text-xs text-muted-foreground">
          Fyrir stærri keðjur og mörg útibú.
        </div>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Haus */}
      <header className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold">Prófíll</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Yfirlit yfir aðganginn þinn og útsölutilboð verslunarinnar.
        </p>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Upplýsingar um notanda */}
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold text-lg">Aðgangsupplýsingar</h2>
          <p className="text-sm">
            <span className="font-medium">Netfang:</span> {user.email}
          </p>
          <p className="text-sm">
            <span className="font-medium">Hlutverk:</span>{" "}
            {user.role === "store" ? "Verslun" : user.role}
          </p>
        </Card>

        {/* Áskrift & frívika */}
        {store && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold text-lg">Áskrift & frívika</h2>

            {storeStatusLoading && (
              <p className="text-xs text-muted-foreground">
                Sæki áskriftarstöðu...
              </p>
            )}

            {storeStatusError && (
              <p className="text-xs text-destructive">{storeStatusError}</p>
            )}

            {billingActive ? (
              <>
                <p className="text-sm">
                  <span className="font-medium">Pakkategund:</span>{" "}
                  {formatPlanLabel(currentPlan)}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Frívika til:</span>{" "}
                  {trialEndsAt
                    ? new Date(trialEndsAt).toLocaleDateString("is-IS")
                    : "Í fríviku (án dagsetningar)"}
                </p>
                {trial?.daysLeft != null && (
                  <p className="text-xs text-muted-foreground">
                    {trial.daysLeft > 0
                      ? `Um ${trial.daysLeft} dagar eftir af fríviku.`
                      : trial.daysLeft === 0
                        ? "Síðasti dagurinn í fríviku."
                        : "Frívika er útrunnin – virkjaðu áskrift til að halda áfram án truflana."}
                  </p>
                )}
                {!trial && (
                  <p className="text-xs text-green-700">
                    Aðgangurinn þinn er virkur – þú getur búið til og stýrt
                    útsölutilboðum.
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    Þú getur uppfært pakkann þinn hvenær sem er.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPlanEditor((v) => !v)}
                  >
                    {showPlanEditor ? "Loka pakkavali" : "Breyta pakka"}
                  </Button>
                </div>

                {showPlanEditor && (
                  <div className="mt-3 space-y-2">
                    {renderPlanChoices((p) => setSelectedPlan(p), selectedPlan)}

                    {planError && (
                      <p className="text-sm text-destructive">{planError}</p>
                    )}

                    <Button
                      className="w-full"
                      onClick={handleActivatePlan}
                      disabled={planLoading}
                    >
                      {planLoading
                        ? "Uppfæri pakka..."
                        : `Uppfæra í ${formatPlanLabel(selectedPlan)} pakka`}
                    </Button>

                    <p className="text-[11px] text-muted-foreground">
                      Pakkabreyting tekur gildi strax. Reikningsgerð og
                      greiðslur verða stílaðar í takt við valinn pakka þegar
                      greiðslukerfið er virkjað.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Veldu pakka til að virkja 7 daga fríviku og fá fullan aðgang
                  að ÚtsalApp.
                </p>

                {renderPlanChoices((p) => setSelectedPlan(p), selectedPlan)}

                {planError && (
                  <p className="text-sm text-destructive">{planError}</p>
                )}

                <Button
                  className="w-full"
                  onClick={handleActivatePlan}
                  disabled={planLoading}
                >
                  {planLoading
                    ? "Virki pakka..."
                    : `Virkja ${formatPlanLabel(
                        selectedPlan,
                      )} pakka og fríviku`}
                </Button>

                <p className="text-[11px] text-muted-foreground">
                  Frívikan er án skuldbindingar. Eftir prufutímann geturðu hætt
                  þegar er þér hentar.
                </p>
              </>
            )}
          </Card>
        )}

        {/* Verslun + action takkar */}
        <Card className="p-4 space-y-2">
          <h2 className="font-semibold text-lg">Verslun</h2>
          {store ? (
            <>
              <p className="text-sm">
                <span className="font-medium">Nafn verslunar:</span>{" "}
                {store.name}
              </p>

              {storeAddress && (
                <p className="text-sm">
                  <span className="font-medium">Heimilisfang:</span>{" "}
                  {storeAddress}
                </p>
              )}

              {storePhone && (
                <p className="text-sm">
                  <span className="font-medium">Sími:</span> {storePhone}
                </p>
              )}

              {storeWebsite && (
                <p className="text-sm">
                  <span className="font-medium">Vefsíða:</span>{" "}
                  <a
                    href={storeWebsite}
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-pink-600"
                  >
                    {storeWebsite}
                  </a>
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Þetta er verslunin sem tilboðin þín tengjast í ÚtsalApp.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Engin verslun er tengd þessum aðgangi.
            </p>
          )}

          {user.role === "store" && (
            <>
              <Link to="/create">
                <Button
                  className="w-full mt-3"
                  disabled={!billingActive}
                  title={
                    !billingActive
                      ? "Virkjaðu fríviku og pakka hér að ofan til að geta búið til útsölutilboð."
                      : undefined
                  }
                >
                  Búa til nýtt útsölutilboð
                </Button>
              </Link>
              {!billingActive && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Til að geta búið til tilboð þarf fyrst að virkja fríviku og
                  pakka hér að ofan.
                </p>
              )}
            </>
          )}

          <Button
            variant="destructive"
            className="w-full mt-2"
            onClick={async () => {
              await logout();
              window.location.href = "/profile";
            }}
          >
            Skrá út
          </Button>
        </Card>

        {/* Tilboð verslunarinnar */}
        {store && (
          <section className="space-y-3">
            <h2 className="font-semibold text-lg">
              Tilboð verslunarinnar ({posts.length})
            </h2>

            {postsLoading && (
              <p className="text-sm text-muted-foreground">
                Sæki tilboð verslunar...
              </p>
            )}

            {postsError && (
              <Card className="p-3 text-sm text-destructive">{postsError}</Card>
            )}

            {!postsLoading && !postsError && posts.length === 0 && (
              <Card className="p-4 text-sm text-muted-foreground">
                Engin tilboð hafa verið skráð fyrir þessa verslun ennþá. Smelltu
                á „Búa til nýtt útsölutilboð“ til að bæta við.
              </Card>
            )}

            {!postsLoading && !postsError && posts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {posts.map((post) => {
                  const mainImage = post.images?.[0];
                  const discount = calculateDiscount(
                    post.priceOriginal,
                    post.priceSale,
                  );
                  const timeRemaining = getTimeRemaining(post.endsAt);
                  const detailHref = `/post/${post.id}`;
                  const isDeleting = deletingId === post.id;

                  return (
                    <Card
                      key={post.id}
                      className="p-3 space-y-2 rounded-xl border border-border bg-background"
                    >
                      <Link
                        to={detailHref}
                        className="block rounded-xl overflow-hidden"
                      >
                        <div className="relative w-full h-40 bg-muted overflow-hidden rounded-lg">
                          {mainImage ? (
                            <img
                              src={mainImage.url}
                              alt={mainImage.alt ?? post.title}
                              className="w-full h-full object-cover object-center"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                              Engin mynd
                            </div>
                          )}

                          {discount > 0 && (
                            <div className="absolute top-2 right-2 bg-pink-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                              -{discount}%
                            </div>
                          )}
                        </div>

                        <div className="mt-2 space-y-1">
                          <div className="text-[11px] text-muted-foreground">
                            {store.name}
                          </div>
                          <div className="font-semibold text-sm line-clamp-2">
                            {post.title}
                          </div>
                          {post.description && (
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {post.description}
                            </div>
                          )}
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-sm font-bold text-pink-600">
                              {formatPrice(post.priceSale ?? post.price)}
                            </span>
                            {post.priceOriginal != null && (
                              <span className="text-xs text-muted-foreground line-through">
                                {formatPrice(post.priceOriginal)}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>{timeRemaining}</span>
                            <span>{post.viewCount ?? 0} skoðanir</span>
                          </div>
                        </div>
                      </Link>

                      <div className="flex gap-2 mt-1">
                        <Link to={`/edit/${post.id}`} className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-sm"
                            disabled={isDeleting}
                          >
                            Breyta tilboði
                          </Button>
                        </Link>

                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 text-sm"
                          disabled={isDeleting}
                          onClick={() => handleDelete(post.id)}
                        >
                          {isDeleting ? "Eyði..." : "Eyða"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
