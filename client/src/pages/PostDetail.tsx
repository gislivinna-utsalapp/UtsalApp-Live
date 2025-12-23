// client/src/pages/PostDetail.tsx

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { SalePostWithDetails } from "@shared/schema";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { formatPrice, calculateDiscount, getTimeRemaining } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// SAMA myndarökfræði og í SalePostCard
function buildImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;

  // Ef slóðin er nú þegar absolute (http/https) -> notum hana beint
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // Í production (Netlify) þurfum við að preppa slóðina með API_BASE_URL
  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${base}${path}`;
  }

  // Í dev (Replit) dugar relative slóð því frontend + backend eru á sama host
  return rawUrl;
}

async function fetchPost(id: string): Promise<SalePostWithDetails> {
  return apiFetch<SalePostWithDetails>(`/api/v1/posts/${id}`);
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["post", id],
    enabled: !!id,
    queryFn: () => fetchPost(id as string),
  });

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <p className="text-center text-sm text-muted-foreground">
          Engin auglýsing fannst (vantar auðkenni).
        </p>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Til baka
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <p className="text-center text-sm text-muted-foreground">
          Sæki auglýsingu…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <p className="text-center text-sm text-muted-foreground">
          Tókst ekki að sækja auglýsinguna.
        </p>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Til baka
          </Button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <p className="text-center text-sm text-muted-foreground">
          Auglýsing finnst ekki.
        </p>
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Til baka
          </Button>
        </div>
      </div>
    );
  }

  // PASSAR VIÐ BACKEND:
  // routes.ts → mapPostToFrontend: priceOriginal, priceSale, endsAt, buyUrl
  const discount = calculateDiscount(post.priceOriginal, post.priceSale);

  const remainingRaw = post.endsAt ? getTimeRemaining(post.endsAt) : null;

  let timeRemainingText: string | null = null;
  if (typeof remainingRaw === "string") {
    timeRemainingText = remainingRaw;
  } else if (
    remainingRaw &&
    typeof remainingRaw === "object" &&
    "totalMs" in remainingRaw
  ) {
    const r = remainingRaw as {
      days: number;
      hours: number;
      minutes: number;
      totalMs: number;
    };

    if (r.totalMs > 0) {
      const parts: string[] = [];
      if (r.days > 0) parts.push(`${r.days} dagar`);
      if (r.hours > 0) parts.push(`${r.hours} klst`);
      if (r.minutes > 0) parts.push(`${r.minutes} mín`);

      timeRemainingText =
        parts.length > 0 ? `Endar eftir ${parts.join(" ")}` : "Endar fljótlega";
    } else {
      timeRemainingText = "Útsölunni er lokið";
    }
  }

  const mainImage = buildImageUrl(
    post.images && post.images.length > 0 ? post.images[0].url : null,
  );

  return (
    <div className="max-w-3xl mx-auto pb-24 bg-background">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Til baka
        </button>
        <h1 className="text-base font-semibold truncate text-foreground">
          {post.title || "Útsölutilboð"}
        </h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        <Card className="overflow-hidden bg-card text-card-foreground border border-border rounded-2xl shadow-sm">
          {/* NAFN FYRIRTÆKIS EFST Í AUGLÝSINGABOXINU */}
          {post.store && post.store.name && (
            <div className="px-4 pt-4 pb-2 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground">
                {post.store.name}
              </p>
            </div>
          )}

          {mainImage && (
            <div className="aspect-[3/4] w-full bg-muted overflow-hidden">
              <img
                src={mainImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* Titill + verslun */}
            <div className="space-y-1">
              <h2 className="text-xl font-semibold mb-1 text-foreground">
                {post.title}
              </h2>
              {post.store && (
                <p className="text-sm text-muted-foreground">
                  {post.store.name}
                  {" · "}
                  {post.store.address && post.store.address.trim().length > 0
                    ? post.store.address
                    : "Staðsetning vantar"}
                </p>
              )}
            </div>

            {/* Afsláttur + verð */}
            <div className="space-y-2">
              {discount ? (
                <div className="inline-flex items-baseline gap-2 rounded-full bg-accent text-accent-foreground px-3 py-1 border border-border">
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Afsláttur
                  </span>
                  <span className="text-sm font-bold">-{discount}%</span>
                </div>
              ) : null}

              <div className="flex items-baseline gap-3">
                <div className="text-2xl font-bold text-foreground">
                  {formatPrice(post.priceSale)}
                </div>
                {post.priceOriginal && post.priceOriginal > post.priceSale && (
                  <div className="text-sm text-muted-foreground line-through">
                    {formatPrice(post.priceOriginal)}
                  </div>
                )}
              </div>

              {timeRemainingText && (
                <p className="text-xs text-muted-foreground font-medium">
                  {timeRemainingText}
                </p>
              )}
            </div>

            {/* Lýsing */}
            {post.description && (
              <p className="text-sm text-foreground whitespace-pre-line">
                {post.description}
              </p>
            )}

            {/* Flokkur */}
            {post.category && (
              <p className="text-xs text-muted-foreground">
                Flokkur:{" "}
                <span className="font-medium text-foreground">
                  {post.category}
                </span>
              </p>
            )}

            {/* KAUPA HNAPPUR */}
            {post.buyUrl && (
              <div className="pt-2">
                <a
                  href={post.buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm py-2">
                    Smelltu hér til að kaupa tilboðið
                  </Button>
                </a>
                <p className="mt-1 text-[11px] text-muted-foreground text-center">
                  Þú ferð á síðu verslunar til að ljúka kaupunum.
                </p>
              </div>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
