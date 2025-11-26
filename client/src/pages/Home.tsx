// client/src/pages/Home.tsx
import { useQuery } from "@tanstack/react-query";
import type { SalePostWithDetails } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { formatPrice, getTimeRemaining, calculateDiscount } from "@/lib/utils";

async function fetchHomePosts(): Promise<SalePostWithDetails[]> {
  const res = await fetch("/api/v1/posts");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Tókst ekki að sækja útsölur.");
  }
  return res.json() as Promise<SalePostWithDetails[]>;
}

export default function Home() {
  const {
    data: posts,
    isLoading,
    isError,
    error,
  } = useQuery<SalePostWithDetails[]>({
    queryKey: ["home-posts"],
    queryFn: fetchHomePosts,
  });

  return (
    <div className="min-h-screen pb-24">
      {/* Haus – bara logo */}
      <header className="px-4 pt-6 pb-4 border-b border-border">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
          <img
            src="/utsalapp-logo.jpg"
            alt="ÚtsalApp"
            className="w-48 h-auto mb-3"
          />
        </div>
      </header>

      {/* Efni */}
      <main className="p-3 max-w-4xl mx-auto space-y-3">
        {isError && (
          <Card className="p-3 text-xs text-destructive">
            Villa við að sækja útsölur: {(error as Error)?.message}
          </Card>
        )}

        {isLoading && !isError && (
          <p className="text-xs text-muted-foreground">Sæki útsölur...</p>
        )}

        {!isLoading && !isError && posts && posts.length === 0 && (
          <Card className="p-5 text-center space-y-2">
            <p className="font-medium text-sm">
              Engar útsölur skráðar í augnablikinu.
            </p>
            <p className="text-xs text-muted-foreground">
              Verslanir geta skráð sig inn og sett inn útsölutilboð sem birtast
              hér.
            </p>
          </Card>
        )}

        {!isLoading && !isError && posts && posts.length > 0 && (
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
                <a key={post.id} href={detailHref} className="block">
                  <Card className="p-2 space-y-1 rounded-xl border border-border bg-background hover:shadow-md transition-shadow">
                    {/* MyndarammI – 1:1 fyrir “grid look” eins og Boozt */}
                    <div className="relative w-full aspect-square overflow-hidden rounded-lg bg-muted">
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

                    {/* Textaupplýsingar */}
                    <div className="mt-1.5 space-y-0.5">
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
                      <div className="mt-0.5 flex items-baseline gap-1.5">
                        <span className="text-sm font-bold text-pink-600">
                          {formatPrice(post.priceSale ?? post.price)}
                        </span>
                        {post.priceOriginal != null && (
                          <span className="text-[11px] text-muted-foreground line-through">
                            {formatPrice(post.priceOriginal)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{timeRemaining}</span>
                        <span>{post.viewCount ?? 0} skoðanir</span>
                      </div>
                    </div>
                  </Card>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
