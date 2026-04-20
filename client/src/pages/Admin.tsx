import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Store, FileText, LogOut, BarChart2 } from "lucide-react";

import { useAuth } from "../lib/auth";
import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type AdminPost = {
  id: string;
  title: string;
  category: string | null;
  price: number;
  oldPrice: number;
  imageUrl: string | null;
  storeName: string;
  createdAt: string | null;
};

type AdminStore = {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
  plan: string;
  billingStatus: string;
  trialEndsAt: string | null;
  createdAt: string | null;
};

type Tab = "posts" | "stores";

export default function AdminPage() {
  const { authUser, isAdmin, loading, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>("posts");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("utsalapp_token") || localStorage.getItem("token") || ""
      : "";

  const authHeader = { Authorization: `Bearer ${token}` };

  const {
    data: posts = [],
    isLoading: postsLoading,
    refetch: refetchPosts,
  } = useQuery<AdminPost[]>({
    queryKey: ["admin-posts"],
    enabled: isAdmin,
    queryFn: () =>
      apiFetch<AdminPost[]>("/api/v1/admin/posts", { headers: authHeader }),
  });

  const {
    data: stores = [],
    isLoading: storesLoading,
    refetch: refetchStores,
  } = useQuery<AdminStore[]>({
    queryKey: ["admin-stores"],
    enabled: isAdmin,
    queryFn: () =>
      apiFetch<AdminStore[]>("/api/v1/admin/stores", { headers: authHeader }),
  });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-8 text-center">
        <p className="text-sm text-muted-foreground">Hleð...</p>
      </div>
    );
  }

  if (!authUser || !isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-8 text-center">
        <p className="text-sm text-red-500 mb-4">Aðgangur bannaður.</p>
        <Button onClick={() => navigate("/")}>Til baka</Button>
      </div>
    );
  }

  async function handleDeletePost(post: AdminPost) {
    const confirmed = window.confirm(
      `Eyða auglýsingunni „${post.title}"?\nÞetta er óafturkræft.`,
    );
    if (!confirmed) return;

    setErrorMsg(null);
    setDeletingId(post.id);
    try {
      await apiFetch(`/api/v1/admin/posts/${post.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      await refetchPosts();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Tókst ekki að eyða auglýsingu.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteStore(store: AdminStore) {
    const confirmed = window.confirm(
      `Eyða verslununni „${store.name}" (${store.email ?? "?"})?\n` +
        `Þetta eyðir einnig notandareikningi og ÖLLUM auglýsingum verslunarinnar.\n\nÞetta er óafturkræft.`,
    );
    if (!confirmed) return;

    setErrorMsg(null);
    setDeletingId(store.id);
    try {
      await apiFetch(`/api/v1/admin/stores/${store.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      await refetchStores();
      await refetchPosts();
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Tókst ekki að eyða verslun.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2 text-sm rounded-md border transition-colors ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background border-border hover:bg-muted"
    }`;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 pt-4 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg font-bold">Admin stjórnborð</h1>
          <p className="text-xs text-muted-foreground">
            Innskráður sem {authUser.user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/analytics")}
            data-testid="button-analytics"
          >
            <BarChart2 className="w-3 h-3 mr-1" />
            Greiningar
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-3 h-3 mr-1" />
            Útskrá
          </Button>
        </div>
      </header>

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          className={tabClass(tab === "posts")}
          onClick={() => setTab("posts")}
          data-testid="tab-admin-posts"
        >
          <FileText className="w-4 h-4" />
          Auglýsingar ({posts.length})
        </button>
        <button
          type="button"
          className={tabClass(tab === "stores")}
          onClick={() => setTab("stores")}
          data-testid="tab-admin-stores"
        >
          <Store className="w-4 h-4" />
          Verslanir ({stores.length})
        </button>
      </div>

      {errorMsg && (
        <Card className="p-3 border-red-300 bg-red-50">
          <p className="text-sm text-red-600">{errorMsg}</p>
        </Card>
      )}

      {tab === "posts" && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            Allar auglýsingar — {posts.length} total
          </h2>

          {postsLoading && (
            <p className="text-xs text-muted-foreground">Sæki auglýsingar…</p>
          )}

          {!postsLoading && posts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Engar auglýsingar eru skráðar.
            </p>
          )}

          {!postsLoading && posts.length > 0 && (
            <div className="space-y-2">
              {posts.map((post) => {
                const isDeleting = deletingId === post.id;
                return (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 border border-border rounded-md p-3"
                    data-testid={`row-post-${post.id}`}
                  >
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-12 h-12 rounded object-cover flex-shrink-0 bg-muted"
                      />
                    )}
                    {!post.imageUrl && (
                      <div className="w-12 h-12 rounded bg-muted flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {post.storeName}
                        {post.category ? ` · ${post.category}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {post.price.toLocaleString("is-IS")} kr.
                        {post.oldPrice > 0 && post.oldPrice > post.price && (
                          <span className="line-through ml-2 text-neutral-400">
                            {post.oldPrice.toLocaleString("is-IS")} kr.
                          </span>
                        )}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 border-red-400 text-red-600"
                      disabled={isDeleting}
                      onClick={() => handleDeletePost(post)}
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {isDeleting ? "Eyði…" : "Eyða"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "stores" && (
        <Card className="p-4 space-y-3">
          <h2 className="text-sm font-semibold">
            Allar verslanir — {stores.length} total
          </h2>
          <p className="text-xs text-muted-foreground">
            Að eyða verslun eyðir einnig notanda og öllum auglýsingum
            verslunarinnar.
          </p>

          {storesLoading && (
            <p className="text-xs text-muted-foreground">Sæki verslanir…</p>
          )}

          {!storesLoading && stores.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Engar verslanir eru skráðar.
            </p>
          )}

          {!storesLoading && stores.length > 0 && (
            <div className="space-y-2">
              {stores.map((store) => {
                const isDeleting = deletingId === store.id;
                const trialEnd = store.trialEndsAt
                  ? new Date(store.trialEndsAt).toLocaleDateString("is-IS")
                  : null;
                return (
                  <div
                    key={store.id}
                    className="flex items-start gap-3 border border-border rounded-md p-3"
                    data-testid={`row-store-${store.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {store.email ?? "Ekkert netfang"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pakki: {store.plan} · Staða: {store.billingStatus}
                        {trialEnd ? ` · Frívika til: ${trialEnd}` : ""}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-shrink-0 border-red-400 text-red-600"
                      disabled={isDeleting || store.email === authUser.user.email}
                      onClick={() => handleDeleteStore(store)}
                      data-testid={`button-delete-store-${store.id}`}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      {isDeleting
                        ? "Eyði…"
                        : store.email === authUser.user.email
                          ? "Eigin reikningur"
                          : "Eyða"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
