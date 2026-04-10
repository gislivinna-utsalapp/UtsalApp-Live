import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useCart } from "@/hooks/useCart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function buildImageUrl(rawPath?: string | null): string {
  if (!rawPath) return "";
  if (/^https?:\/\//i.test(rawPath)) return rawPath;
  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return `${base}${p}`;
  }
  return rawPath;
}

function pickFirstImageUrl(images: unknown): string {
  const arr = Array.isArray(images) ? images : [];
  for (const item of arr) {
    if (!item) continue;
    if (typeof item === "string" && item.trim()) return item.trim();
    if (typeof item === "object" && (item as any)?.url) {
      const u = (item as any).url;
      if (typeof u === "string" && u.trim()) return u.trim();
    }
  }
  return "";
}

export default function CartPage() {
  const { cartIds, removeFromCart } = useCart();

  const { data: rawData, isLoading } = useQuery<any>({
    queryKey: ["posts", "cart"],
    queryFn: () => apiFetch("/api/v1/posts?limit=1000"),
  });

  const allPosts: any[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.posts)
      ? rawData.posts
      : [];

  const cartPosts = allPosts.filter((p: any) => cartIds.includes(p.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-primary" />
        <h1 className="text-lg font-semibold">Karfan mín</h1>
        {cartIds.length > 0 && (
          <span className="text-xs text-muted-foreground">
            ({cartIds.length})
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-24 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && cartPosts.length === 0 && (
        <Card className="p-8 text-center space-y-3">
          <ShoppingCart className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Karfan þín er tóm
          </p>
          <p className="text-xs text-muted-foreground">
            Smelltu á körfutáknið á tilboðum til að vista þau hér.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Skoða tilboð</Link>
          </Button>
        </Card>
      )}

      {!isLoading && cartPosts.length > 0 && (() => {
        const totalSale = cartPosts.reduce(
          (sum: number, p: any) =>
            sum + (typeof p.priceSale === "number" ? p.priceSale : 0),
          0,
        );
        const totalOriginal = cartPosts.reduce(
          (sum: number, p: any) =>
            sum + (typeof p.priceOriginal === "number" ? p.priceOriginal : 0),
          0,
        );
        const hasPrices = cartPosts.some(
          (p: any) => typeof p.priceSale === "number",
        );
        return (
        <div className="space-y-2">
          {cartPosts.map((post: any) => {
            const rawImg = pickFirstImageUrl(post.images);
            const imgUrl = buildImageUrl(rawImg);

            return (
              <Card
                key={post.id}
                className="p-3 flex items-center gap-3"
                data-testid={`cart-item-${post.id}`}
              >
                <Link
                  to={`/post/${post.id}`}
                  className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-muted"
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground">
                      Engin mynd
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0">
                  <Link to={`/post/${post.id}`}>
                    <h3 className="text-sm font-medium truncate hover:underline">
                      {post.title}
                    </h3>
                  </Link>
                  {post.store?.name && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {post.store.name}
                    </p>
                  )}
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    {post.priceSale != null && (
                      <span className="text-xs font-bold text-primary">
                        {post.priceSale.toLocaleString("is-IS")} kr
                      </span>
                    )}
                    {post.priceOriginal != null &&
                      post.priceOriginal > (post.priceSale ?? 0) && (
                        <span className="text-[10px] line-through text-muted-foreground">
                          {post.priceOriginal.toLocaleString("is-IS")} kr
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {post.buyUrl && (
                    <Button asChild size="sm" variant="default">
                      <a
                        href={post.buyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`button-buy-${post.id}`}
                      >
                        Kaupa
                      </a>
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeFromCart(post.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    data-testid={`button-remove-cart-${post.id}`}
                    title="Fjarlægja úr körfu"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            );
          })}

          {hasPrices && (
            <Card className="p-4 mt-2" data-testid="cart-total">
              <div className="space-y-1.5">
                {totalOriginal > totalSale && (
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Upprunalegt verð</span>
                    <span className="line-through">
                      {totalOriginal.toLocaleString("is-IS")} kr
                    </span>
                  </div>
                )}
                {totalOriginal > totalSale && (
                  <div className="flex justify-between items-center text-sm text-green-600 font-medium">
                    <span>Sparnaður</span>
                    <span>
                      -{(totalOriginal - totalSale).toLocaleString("is-IS")} kr
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-border">
                  <span className="font-semibold text-base">Samtals</span>
                  <span
                    className="font-bold text-lg text-primary"
                    data-testid="text-cart-total"
                  >
                    {totalSale.toLocaleString("is-IS")} kr
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
        );
      })()}
    </div>
  );
}
