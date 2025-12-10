// client/src/pages/StoreProfilePage.tsx

import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getTimeRemaining } from "@/lib/utils";

// ---- TÝPUR ----

type StoreInfo = {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  createdAt?: string | null;
  categories?: string[];
  subcategories?: string[];
  plan?: string | null;
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

// ---- FLOKKUN (sama og í Profile) ----

type Subcategory = {
  value: string;
  label: string;
};

type MegaCategory = {
  id: string;
  name: string;
  description?: string;
  subcategories: Subcategory[];
};

const MEGA_CATEGORIES: MegaCategory[] = [
  {
    id: "food",
    name: "Veitingar & Matur",
    description: "Tilboð á mat, drykkjum og happy hour.",
    subcategories: [
      { value: "Matur & veitingar", label: "Matur & veitingar" },
      { value: "Happy Hour", label: "Happy Hour" },
    ],
  },
  {
    id: "fashion",
    name: "Fatnaður & Lífstíll",
    description: "Fatnaður, skór og íþróttatíska.",
    subcategories: [
      { value: "Fatnaður - Konur", label: "Fatnaður - Konur" },
      { value: "Fatnaður - Karlar", label: "Fatnaður - Karlar" },
      { value: "Fatnaður - Börn", label: "Fatnaður - Börn" },
      { value: "Skór", label: "Skór" },
      { value: "Íþróttavörur", label: "Íþróttavörur" },
      { value: "Leikföng & börn", label: "Leikföng & börn" },
    ],
  },
  {
    id: "home",
    name: "Heimili & Húsgögn",
    description: "Húsgögn, innréttingar og heimilislíf.",
    subcategories: [{ value: "Heimili & húsgögn", label: "Heimili & húsgögn" }],
  },
  {
    id: "tech",
    name: "Tækni & Rafmagn",
    description: "Raftæki, græjur og snjallheimili.",
    subcategories: [{ value: "Raftæki", label: "Raftæki" }],
  },
  {
    id: "beauty-other",
    name: "Beauty, Heilsu & Annað",
    description: "Snyrting, heilsuvörur og annað.",
    subcategories: [
      { value: "Snyrtivörur", label: "Snyrtivörur" },
      { value: "Annað", label: "Annað" },
    ],
  },
];

function normalizeCategory(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

function getCategoryDisplayLabel(category?: string | null): string {
  if (!category) return "Óflokkað";
  const normalized = normalizeCategory(category);

  for (const mega of MEGA_CATEGORIES) {
    for (const sub of mega.subcategories) {
      const subNorm = normalizeCategory(sub.value);
      if (subNorm && subNorm === normalized) {
        return `${mega.name} · ${sub.label}`;
      }
    }
  }

  return category;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function formatDate(dateStr?: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("is-IS");
}

// Tími eftir af tilboði – sama lógík og í Profile
function getPostTimeRemainingLabel(endsAt?: string | null): string | null {
  if (!endsAt) return null;

  const remaining = getTimeRemaining(endsAt);

  if (typeof remaining === "string") {
    return remaining;
  }

  if (remaining && typeof remaining === "object" && "totalMs" in remaining) {
    const { days, hours, minutes, totalMs } = remaining as {
      days: number;
      hours: number;
      minutes: number;
      totalMs: number;
    };

    if (totalMs <= 0) {
      return "Útsölunni er lokið";
    }

    if (days > 1) {
      return `${days} dagar eftir af tilboðinu`;
    }

    if (days === 1) {
      return "1 dagur eftir af tilboðinu";
    }

    if (hours > 0) {
      return "Endar innan 24 klst";
    }

    if (minutes > 0) {
      return "Endar fljótlega";
    }

    return "Endar fljótlega";
  }

  return null;
}

// ---- GÖGN ----

async function fetchStore(storeId: string): Promise<StoreInfo> {
  return apiFetch<StoreInfo>(`/api/v1/stores/${storeId}`);
}

async function fetchStorePosts(storeId: string): Promise<StorePost[]> {
  return apiFetch<StorePost[]>(`/api/v1/stores/${storeId}/posts`);
}

// ---- SÍÐAN FYRIR NOTENDUR ----

export default function StoreProfilePage() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();

  const {
    data: store,
    isLoading: loadingStore,
    error: storeError,
  } = useQuery({
    queryKey: ["public-store", storeId],
    enabled: !!storeId,
    queryFn: () => fetchStore(storeId as string),
  });

  const {
    data: posts = [],
    isLoading: loadingPosts,
    error: postsError,
  } = useQuery({
    queryKey: ["public-store-posts", storeId],
    enabled: !!storeId,
    queryFn: () => fetchStorePosts(storeId as string),
  });

  const createdAtLabel = formatDate(store?.createdAt ?? null);

  const stats = useMemo(() => {
    const total = posts.length;
    const activeCount = posts.filter((p) => {
      if (!p.endsAt) return true;
      const label = getPostTimeRemainingLabel(p.endsAt);
      return label !== "Útsölunni er lokið";
    }).length;

    return { total, activeCount };
  }, [posts]);

  if (!storeId) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">
            Verslun fannst ekki – slóðin er gölluð.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4 space-y-4">
      {/* Haus – til baka hnappur */}
      <header className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => navigate(-1)}
        >
          ← Til baka
        </Button>
      </header>

      {/* Upplýsingar um verslun */}
      <Card className="p-4 space-y-3">
        {loadingStore && (
          <p className="text-sm text-muted-foreground">
            Sæki upplýsingar um verslun…
          </p>
        )}

        {storeError && !loadingStore && (
          <p className="text-sm text-red-600">
            Tókst ekki að sækja upplýsingar um verslun.
          </p>
        )}

        {!loadingStore && !storeError && store && (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h1 className="text-lg font-semibold">
                  {store.name || "Verslun"}
                </h1>
                {store.address && (
                  <p className="text-xs text-muted-foreground">
                    {store.address}
                  </p>
                )}
                {store.phone && (
                  <p className="text-xs text-muted-foreground">
                    Sími: {store.phone}
                  </p>
                )}
                {store.website && (
                  <p className="text-xs text-muted-foreground">
                    Vefsíða:{" "}
                    <a
                      href={
                        store.website.startsWith("http")
                          ? store.website
                          : `https://${store.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {store.website}
                    </a>
                  </p>
                )}
                {createdAtLabel && (
                  <p className="text-[11px] text-muted-foreground">
                    Í ÚtsalApp frá: {createdAtLabel}
                  </p>
                )}
              </div>

              <div className="text-right space-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    Virk tilboð
                  </p>
                  <p className="text-2xl font-bold leading-none">
                    {stats.activeCount}
                  </p>
                </div>
                {store.plan && (
                  <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-700">
                    {store.plan === "premium"
                      ? "Premium samstarf"
                      : store.plan === "pro"
                        ? "Pro samstarf"
                        : "Basic samstarf"}
                  </span>
                )}
              </div>
            </div>

            {/* Flokkar og undirflokkar verslunar */}
            {(store.categories?.length || store.subcategories?.length) && (
              <div className="pt-2 space-y-2">
                {store.categories && store.categories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {store.categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-700"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
                {store.subcategories && store.subcategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {store.subcategories.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[11px] font-medium text-gray-700"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Card>

      {/* Tilboð verslunar – sýnilegt fyrir alla notendur */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tilboð frá þessari verslun</h2>
          <p className="text-[11px] text-muted-foreground">
            {stats.total} tilboð skráð
          </p>
        </div>

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

        {!loadingPosts && !postsError && posts.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Þessi verslun er ekki með virk tilboð í augnablikinu. Kíktu aftur
            síðar – ný tilboð birtast reglulega.
          </p>
        )}

        {!loadingPosts && !postsError && posts.length > 0 && (
          <div className="space-y-3">
            {posts.map((post) => {
              const rawImageUrl = post.images?.[0]?.url ?? "";
              let firstImageUrl = "";

              if (rawImageUrl) {
                if (
                  rawImageUrl.startsWith("http://") ||
                  rawImageUrl.startsWith("https://") ||
                  rawImageUrl.startsWith("data:")
                ) {
                  firstImageUrl = rawImageUrl;
                } else if (API_BASE_URL) {
                  firstImageUrl = `${API_BASE_URL}${rawImageUrl}`;
                } else {
                  firstImageUrl = rawImageUrl;
                }
              }

              const timeRemainingLabel = getPostTimeRemainingLabel(post.endsAt);

              return (
                <div
                  key={post.id}
                  className="border border-gray-200 rounded-md p-3 text-sm flex gap-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  {firstImageUrl && (
                    <img
                      src={firstImageUrl}
                      alt={post.images?.[0]?.alt || post.title}
                      className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{post.title}</p>
                        {post.category && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            Flokkur: {getCategoryDisplayLabel(post.category)}
                          </p>
                        )}
                        {post.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2">
                            {post.description}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-[11px] text-muted-foreground whitespace-nowrap">
                        {typeof post.viewCount === "number" && (
                          <p>{post.viewCount} skoðanir</p>
                        )}
                        {timeRemainingLabel && (
                          <p className="text-[10px] text-neutral-500">
                            {timeRemainingLabel}
                          </p>
                        )}
                      </div>
                    </div>

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

                    {post.buyUrl && (
                      <div className="pt-1">
                        <a
                          href={
                            post.buyUrl.startsWith("http")
                              ? post.buyUrl
                              : `https://${post.buyUrl}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#FF7300] underline underline-offset-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Skoða nánar / kaupa
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
