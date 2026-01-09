// client/src/pages/PostDetail.tsx

import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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

  const [imageOpen, setImageOpen] = useState(false);

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
        <p className="text-center text-sm text-neutral-400">
          Engin auglýsing fannst (vantar auðkenni).
        </p>
        <div className="mt-4 text-center">
          <Button onClick={() => navigate(-1)}>Til baka</Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <p className="text-center text-sm text-neutral-400">Sæki auglýsingu…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <p className="text-center text-sm text-neutral-300">
          Tókst ekki að sækja auglýsinguna.
        </p>
        <div className="mt-4 text-center">
          <Button onClick={() => navigate(-1)}>Til baka</Button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24">
        <p className="text-center text-sm text-neutral-400">
          Auglýsing finnst ekki.
        </p>
        <div className="mt-4 text-center">
          <Button onClick={() => navigate(-1)}>Til baka</Button>
        </div>
      </div>
    );
  }

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
    <div className="max-w-3xl mx-auto pb-24">
      <header className="sticky top-0 z-10 bg-background backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-neutral-300 hover:text-white"
        >
          ← Til baka
        </button>
        <h1 className="text-base font-semibold truncate text-white">
          {post.title || "Útsölutilboð"}
        </h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        <Card className="overflow-hidden bg-white text-black border border-neutral-200 rounded-2xl shadow-md">
          {mainImage && (
            <>
              <div
                className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden cursor-zoom-in"
                onClick={() => setImageOpen(true)}
              >
                <img
                  src={mainImage}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {imageOpen && (
                <div
                  className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
                  onClick={() => setImageOpen(false)}
                >
                  <img
                    src={mainImage}
                    alt={post.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
            </>
          )}

          <div className="p-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold mb-1 text-black">
                {post.title}
              </h2>
              {post.store && (
                <p className="text-sm text-neutral-600">
                  {post.store.name} ·{" "}
                  {(post.store as any).location ||
                    (post.store as any).address ||
                    "Staðsetning vantar"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              {discount && (
                <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 text-pink-700 px-3 py-1">
                  <span className="text-xs font-medium">
                    Afsláttur -{discount}%
                  </span>
                </div>
              )}

              <div className="flex items-baseline gap-3">
                <div className="text-2xl font-bold text-black">
                  {formatPrice(post.priceSale)}
                </div>
                {post.priceOriginal && post.priceOriginal > post.priceSale && (
                  <div className="text-sm text-neutral-500 line-through">
                    {formatPrice(post.priceOriginal)}
                  </div>
                )}
              </div>

              {timeRemainingText && (
                <p className="text-xs text-neutral-600 font-medium">
                  {timeRemainingText}
                </p>
              )}
            </div>

            {post.description && (
              <p className="text-sm text-neutral-800 whitespace-pre-line">
                {post.description}
              </p>
            )}

            {post.category && (
              <p className="text-xs text-neutral-500">
                Flokkur:{" "}
                <span className="font-medium text-neutral-700">
                  {post.category}
                </span>
              </p>
            )}

            {post.buyUrl && (
              <div className="pt-2">
                <a
                  href={post.buyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <Button
                    asChild
                    className="w-full bg-pink-500 hover:bg-pink-600 text-white text-sm py-2 rounded-xl
                               border-none shadow-none ring-0 focus:ring-0 focus:outline-none"
                  >
                    <a
                      href={post.buyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Smelltu hér til að kaupa tilboðið
                    </a>
                  </Button>
                </a>
                <p className="mt-1 text-[11px] text-neutral-500 text-center">
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
