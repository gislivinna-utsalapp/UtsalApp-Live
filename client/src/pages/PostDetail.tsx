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

  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${base}${path}`;
  }

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

  if (!id || isLoading || error || !post) {
    return (
      <div className="max-w-3xl mx-auto p-4 pb-24 text-center">
        <Button onClick={() => navigate(-1)}>Til baka</Button>
      </div>
    );
  }

  const discount = calculateDiscount(post.priceOriginal, post.priceSale);
  const remainingRaw = post.endsAt ? getTimeRemaining(post.endsAt) : null;

  const mainImage = buildImageUrl(
    post.images && post.images.length > 0 ? post.images[0].url : null,
  );

  return (
    <div className="max-w-3xl mx-auto pb-24">
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-neutral-500 hover:text-black"
        >
          ← Til baka
        </button>
        <h1 className="text-base font-semibold truncate">
          {post.title || "Útsölutilboð"}
        </h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        <Card className="overflow-hidden bg-white text-black border border-neutral-200 rounded-2xl shadow-md">
          {/* MYND – SAMI RAMMI OG Í CARD */}
          {mainImage && (
            <>
              <div
                className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-900 cursor-zoom-in"
                onClick={() => setImageOpen(true)}
              >
                <img
                  src={mainImage}
                  alt={post.title}
                  className="absolute inset-0 w-full h-full object-cover"
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

          {/* TEXTABOX */}
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{post.title}</h2>
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
                <div className="inline-flex rounded-full bg-pink-100 text-pink-700 px-3 py-1 text-xs font-medium">
                  Afsláttur -{discount}%
                </div>
              )}

              <div className="flex items-baseline gap-3">
                <div className="text-2xl font-bold">
                  {formatPrice(post.priceSale)}
                </div>
                {post.priceOriginal && post.priceOriginal > post.priceSale && (
                  <div className="text-sm line-through text-neutral-500">
                    {formatPrice(post.priceOriginal)}
                  </div>
                )}
              </div>

              {remainingRaw && (
                <p className="text-xs text-neutral-600 font-medium">
                  {typeof remainingRaw === "string"
                    ? remainingRaw
                    : "Tilboð í gangi"}
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
              <Button
                asChild
                className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl"
              >
                <a href={post.buyUrl} target="_blank" rel="noopener noreferrer">
                  Smelltu hér til að kaupa tilboðið
                </a>
              </Button>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}
