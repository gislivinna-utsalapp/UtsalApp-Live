// client/src/pages/AdminAllPost.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StoreSummary = {
  id: string;
  name: string;
  plan?: "basic" | "pro" | "premium";
  planType?: "basic" | "pro" | "premium";
  billingStatus?: string;
  createdAt?: string | null;
  isBanned?: boolean;
};

type AdminPost = {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  priceOriginal?: number;
  priceSale?: number;
  startsAt?: string | null;
  endsAt?: string | null;
  buyUrl?: string | null;
  viewCount?: number;
  images?: { url: string; alt?: string }[];
  store: StoreSummary | null;
};

type PostsResponse = AdminPost[];

export default function AdminAllPost() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();

  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [showBannedOnly, setShowBannedOnly] = useState(false);

  const {
    data: posts,
    isLoading,
    error,
    refetch,
  } = useQuery<PostsResponse>({
    queryKey: ["admin-all-posts"],
    queryFn: () => apiFetch<PostsResponse>("/api/v1/posts"),
  });

  // Verjum route-ið: ef ekki admin → heim
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [authLoading, isAdmin, navigate]);

  const storeOptions = useMemo(() => {
    const map = new Map<string, StoreSummary>();
    (posts ?? []).forEach((p) => {
      if (p.store) {
        map.set(p.store.id, p.store);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || ""),
    );
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    return posts.filter((p) => {
      const store = p.store;

      if (showBannedOnly) {
        if (!store || !store.isBanned) return false;
      }

      if (storeFilter !== "all") {
        if (!store || store.id !== storeFilter) return false;
      }

      if (planFilter !== "all") {
        const plan = (store?.planType ?? store?.plan) || "basic";
        if (plan !== planFilter) return false;
      }

      return true;
    });
  }, [posts, storeFilter, planFilter, showBannedOnly]);

  async function handleDeletePost(postId: string) {
    const confirmDelete = window.confirm(
      "Ertu viss um að þú viljir eyða þessu tilboði? Þetta er óafturkræft.",
    );
    if (!confirmDelete) return;

    try {
      await apiFetch(`/api/v1/admin/posts/${postId}`, {
        method: "DELETE",
      });
      await refetch();
    } catch (err) {
      console.error("admin delete post error", err);
      alert("Tókst ekki að eyða tilboði (ADMIN).");
    }
  }

  async function handleDeleteStore(storeId: string, storeName?: string) {
    const confirmDelete = window.confirm(
      `Ertu viss um að þú viljir eyða versluninni "${
        storeName ?? ""
      }" og öllum tilboðum hennar? Þetta er óafturkræft.`,
    );
    if (!confirmDelete) return;

    try {
      await apiFetch(`/api/v1/admin/stores/${storeId}`, {
        method: "DELETE",
      });
      await refetch();
    } catch (err) {
      console.error("admin delete store error", err);
      alert("Tókst ekki að eyða verslun.");
    }
  }

  async function handleToggleBan(store: StoreSummary) {
    const newIsBanned = !store.isBanned;
    const confirmBan = window.confirm(
      newIsBanned
        ? `Banna verslunina "${store.name}"? Þá mun hún ekki geta búið til ný tilboð.`
        : `Af-banna verslunina "${store.name}"? Hún fær aftur aðgang að kerfinu.`,
    );
    if (!confirmBan) return;

    try {
      await apiFetch(`/api/v1/admin/stores/${store.id}/ban`, {
        method: "POST",
        body: JSON.stringify({ isBanned: newIsBanned }),
      });
      await refetch();
    } catch (err) {
      console.error("admin ban store error", err);
      alert("Tókst ekki að uppfæra bann-stöðu verslunar.");
    }
  }

  if (authLoading || !isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
        <h1 className="text-xl font-bold mb-4">Admin</h1>
        <p>Hleð inn admin réttindum...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-6 pb-24">
      <h1 className="text-2xl font-bold mb-4">Admin – Öll tilboð</h1>

      <Card className="mb-4 p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-2">
            <label className="block text-xs font-semibold uppercase">
              Verslun
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={storeFilter}
              onChange={(e) => setStoreFilter(e.target.value)}
            >
              <option value="all">Allar verslanir</option>
              {storeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 space-y-2">
            <label className="block text-xs font-semibold uppercase">
              Pakkategund
            </label>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="all">Allir pakkar</option>
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <div className="flex-1 space-y-2">
            <label className="block text-xs font-semibold uppercase">
              Bannaðar verslanir
            </label>
            <div className="flex items-center gap-2 text-sm">
              <input
                id="banned-only"
                type="checkbox"
                checked={showBannedOnly}
                onChange={(e) => setShowBannedOnly(e.target.checked)}
              />
              <label htmlFor="banned-only">Sýna bara bannaðar</label>
            </div>
          </div>

          <div className="flex-none pt-2 md:pt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="w-full"
            >
              Endurhlaða
            </Button>
          </div>
        </div>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Hleð öllum tilboðum...</p>
      )}
      {error && (
        <p className="text-sm text-red-600">
          Tókst ekki að sækja tilboð. Reyndu aftur.
        </p>
      )}

      {!isLoading && filteredPosts.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Engin tilboð fundust með þessum filterum.
        </p>
      )}

      <div className="space-y-3">
        {filteredPosts.map((post) => {
          const store = post.store;
          const plan = (store?.planType ?? store?.plan) || "basic";
          const banned = store?.isBanned ?? false;

          return (
            <Card key={post.id} className="p-3">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="font-semibold text-sm leading-tight">
                      {post.title}
                    </h2>
                    {store && (
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-slate-100">
                        {store.name}
                      </span>
                    )}
                    {banned && (
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                        BÖNNUÐ
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground mb-1">
                    {plan.toUpperCase()} •{" "}
                    {store?.billingStatus ?? "trial/active"} •{" "}
                    {post.category ?? "Flokkur óskilgreindur"}
                  </div>

                  <div className="text-xs text-muted-foreground mb-1">
                    Verð:{" "}
                    {post.priceSale != null ? `${post.priceSale} kr` : "-"}{" "}
                    {post.priceOriginal != null
                      ? `(${post.priceOriginal} kr upprunalegt)`
                      : ""}
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    Skoðanir: {post.viewCount ?? 0}
                  </div>
                </div>

                {post.images && post.images[0] && (
                  <div className="w-16 h-16 flex-shrink-0 overflow-hidden rounded">
                    <img
                      src={post.images[0].url}
                      alt={post.images[0].alt ?? post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeletePost(post.id)}
                >
                  Eyða (ADMIN)
                </Button>

                {store && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleDeleteStore(store.id, store.name ?? undefined)
                      }
                    >
                      Eyða verslun
                    </Button>

                    <Button
                      size="sm"
                      variant={banned ? "outline" : "secondary"}
                      onClick={() => handleToggleBan(store)}
                    >
                      {banned ? "Af-banna verslun" : "Banna verslun"}
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
