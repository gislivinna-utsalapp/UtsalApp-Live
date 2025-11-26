// client/src/pages/Search.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SalePostWithDetails } from "@shared/schema";
import { formatPrice, calculateDiscount, getTimeRemaining } from "@/lib/utils";

async function fetchSearch(query: string): Promise<SalePostWithDetails[]> {
  if (!query || query.trim().length === 0) return [];
  const res = await fetch(`/api/v1/posts?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Tókst ekki að sækja niðurstöður.");
  return res.json() as Promise<SalePostWithDetails[]>;
}

export default function Search() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce (bíður 250ms áður en það leitar)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
    }, 250);

    return () => clearTimeout(t);
  }, [search]);

  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => fetchSearch(debounced),
    enabled: debounced.trim().length > 0,
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Haus – í sama stíl og forsíðan */}
      <header className="px-4 pt-4 pb-3 border-b border-border">
        <h1 className="text-2xl font-bold">Leita</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Leitaðu að útsölutilboðum eftir vörum, vörumerkjum eða verslunum.
        </p>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Search input */}
        <div className="flex gap-2">
          <input
            className="border border-border p-2 rounded w-full text-sm"
            placeholder="Leita að tilboði, vörumerki eða verslun..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Loading */}
        {isLoading && <p className="text-sm text-muted-foreground">Leita...</p>}

        {/* Error */}
        {isError && (
          <Card className="p-4 text-sm text-destructive">
            Villa: {(error as Error)?.message}
          </Card>
        )}

        {/* Empty */}
        {!isLoading && debounced && posts?.length === 0 && (
          <Card className="p-4 text-sm text-center">
            Engar niðurstöður fyrir „{debounced}“.
          </Card>
        )}

        {/* Results – 2 hlið við hlið, alltaf */}
        {!isLoading && posts && posts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {posts.map((post) => {
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
                    {/* Myndarammi – aðeins þéttari til að passa 2 í breidd */}
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
