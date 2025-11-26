// client/src/pages/CategoriesPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SalePostWithDetails } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, getTimeRemaining, calculateDiscount } from "@/lib/utils";

async function fetchAllActivePosts(): Promise<SalePostWithDetails[]> {
  const res = await fetch("/api/v1/posts?activeOnly=true");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Tókst ekki að sækja útsölur.");
  }
  return (await res.json()) as SalePostWithDetails[];
}

// Einföld flokkun: notum bara category sem kemur frá server
function getCategoryKey(post: SalePostWithDetails): string {
  const anyPost = post as any;
  if (anyPost.category && typeof anyPost.category === "string") {
    return anyPost.category;
  }
  return "annad";
}

const CATEGORY_CONFIG: { id: string; label: string }[] = [
  { id: "all", label: "Allar útsölur" },
  { id: "fatnadur", label: "Fatnaður" },
  { id: "heimili", label: "Heimili" },
  { id: "rafmagn", label: "Raftæki" },
  { id: "heilsa", label: "Heilsa" },
  { id: "veitingar", label: "Veitingar" },
  { id: "snyrtivorur", label: "Snyrtivörur" },
  { id: "annad", label: "Annað" },
];

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery<SalePostWithDetails[]>({
    queryKey: ["all-active-posts"],
    queryFn: fetchAllActivePosts,
  });

  const filteredPosts = useMemo(() => {
    if (!posts) return [];
    if (selectedCategory === "all") return posts;

    return posts.filter((p) => getCategoryKey(p) === selectedCategory);
  }, [posts, selectedCategory]);

  return (
    <div className="min-h-screen pb-24">
      {/* Haus + flokkar */}
      <header className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="text-2xl font-bold">Flokkar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Skoðaðu útsölur eftir flokkum – fatnaður, heimili, raftæki, heilsa,
          veitingar, snyrtivörur og annað.
        </p>

        <div className="mt-3 flex gap-2 overflow-x-auto text-sm">
          {CATEGORY_CONFIG.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full border whitespace-nowrap ${
                selectedCategory === cat.id
                  ? "bg-pink-600 text-white border-pink-600"
                  : "bg-background text-foreground border-border"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </header>

      {/* Efni */}
      <main className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Villa */}
        {isError && (
          <Card className="p-4 text-sm text-destructive">
            Villa við að sækja útsölur: {(error as Error)?.message}
          </Card>
        )}

        {/* Loading */}
        {isLoading && !isError && (
          <p className="text-sm text-muted-foreground">Sæki útsölur...</p>
        )}

        {/* Engar niðurstöður í þessum flokki */}
        {!isLoading &&
          !isError &&
          posts &&
          posts.length > 0 &&
          filteredPosts.length === 0 && (
            <Card className="p-6 text-center space-y-2">
              <p className="font-medium">
                Engar útsölur fundust í þessum flokki.
              </p>
              <p className="text-sm text-muted-foreground">
                Prófaðu annan flokk eða veldu „Allar útsölur“.
              </p>
            </Card>
          )}

        {/* Listi af útsölum í völdum flokki – Boozt look, 2 hlið við hlið */}
        {!isLoading && !isError && filteredPosts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filteredPosts.map((post) => {
              const mainImage = post.images?.[0];
              const discount = calculateDiscount(
                post.priceOriginal,
                post.priceSale,
              );
              const timeRemaining = getTimeRemaining(post.endsAt);
              const detailHref = `/post/${post.id}`;

              return (
                <Card
                  key={post.id}
                  className="p-2 space-y-1 rounded-xl border border-border bg-background hover:shadow-md transition-shadow"
                >
                  <a
                    href={detailHref}
                    className="block rounded-xl overflow-hidden"
                  >
                    {/* Mynd – sama style og í Search Boozt-look */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-muted">
                      {mainImage ? (
                        <img
                          src={mainImage.url}
                          alt={mainImage.alt ?? post.title}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-muted-foreground">
                          Engin mynd
                        </div>
                      )}

                      {discount > 0 && (
                        <div className="absolute top-1.5 right-1.5 bg-pink-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                          -{discount}%
                        </div>
                      )}
                    </div>

                    <div className="mt-1.5 space-y-1">
                      <div className="text-[10px] text-muted-foreground truncate">
                        {post.store?.name ?? "Ótilgreind verslun"}
                      </div>
                      <div className="font-semibold text-xs line-clamp-2">
                        {post.title}
                      </div>
                      {post.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-2">
                          {post.description}
                        </div>
                      )}
                      <div className="mt-1 flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-pink-600">
                          {formatPrice(post.priceSale ?? post.price)}
                        </span>
                        {post.priceOriginal != null && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            {formatPrice(post.priceOriginal)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate max-w-[70%]">
                          {timeRemaining}
                        </span>
                        <span>{post.viewCount ?? 0} skoðanir</span>
                      </div>
                    </div>
                  </a>

                  <a href={detailHref}>
                    <Button className="w-full mt-1 text-[11px] h-7">
                      Skoða tilboð
                    </Button>
                  </a>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
