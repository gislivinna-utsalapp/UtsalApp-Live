// client/src/pages/PostDetail.tsx

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { ShoppingCart, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SalePostWithDetails } from "@shared/schema";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { formatPrice, calculateDiscount, getTimeRemaining } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";

function buildImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${base}${path}`;
  }
  return rawUrl;
}

async function fetchPost(id: string): Promise<SalePostWithDetails> {
  return apiFetch<SalePostWithDetails>(`/api/v1/posts/${id}`);
}

// ── Image carousel ────────────────────────────────────────────────────────────

function ImageCarousel({
  images,
  title,
  onTap,
  activeIndex,
  setActiveIndex,
}: {
  images: string[];
  title: string;
  onTap: (index: number) => void;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
}) {
  const touchStartX = useRef<number | null>(null);

  const prev = () => setActiveIndex(Math.max(0, activeIndex - 1));
  const next = () => setActiveIndex(Math.min(images.length - 1, activeIndex + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-900 cursor-zoom-in select-none">
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)`, width: `${images.length * 100}%` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => onTap(activeIndex)}
      >
        {images.map((src, i) => (
          <div
            key={i}
            className="h-full flex-shrink-0"
            style={{ width: `${100 / images.length}%` }}
          >
            <img
              src={src}
              alt={`${title} - mynd ${i + 1}`}
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Prev / Next arrows — only shown when multiple images */}
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            disabled={activeIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1.5 text-white disabled:opacity-20 transition-opacity"
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            disabled={activeIndex === images.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 rounded-full p-1.5 text-white disabled:opacity-20 transition-opacity"
            data-testid="button-carousel-next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                className="rounded-full transition-all"
                style={{
                  width: i === activeIndex ? "20px" : "8px",
                  height: "8px",
                  background: i === activeIndex ? "#ffffff" : "rgba(255,255,255,0.5)",
                }}
                data-testid={`button-dot-${i}`}
              />
            ))}
          </div>

          {/* Counter */}
          <div className="absolute top-3 right-3 bg-black/50 rounded-full px-2 py-0.5 text-xs text-white">
            {activeIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  images,
  title,
  startIndex,
  onClose,
}: {
  images: string[];
  title: string;
  startIndex: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(startIndex);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setCurrent((c) => Math.max(0, c - 1));
  const next = () => setCurrent((c) => Math.min(images.length - 1, c + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-white text-sm">{current + 1} / {images.length}</span>
        <button
          onClick={onClose}
          className="text-white p-1"
          data-testid="button-lightbox-close"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div
          className="flex h-full items-center transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)`, width: `${images.length * 100}%` }}
        >
          {images.map((src, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center justify-center px-2"
              style={{ width: `${100 / images.length}%` }}
            >
              <img
                src={src}
                alt={`${title} - mynd ${i + 1}`}
                className="max-w-full max-h-full object-contain"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={current === 0}
              className="absolute left-2 bg-white/10 rounded-full p-2 text-white disabled:opacity-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              disabled={current === images.length - 1}
              className="absolute right-2 bg-white/10 rounded-full p-2 text-white disabled:opacity-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto justify-center">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors"
              style={{ borderColor: i === current ? "#ffffff" : "transparent" }}
              data-testid={`button-thumb-${i}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  const images: string[] = Array.isArray(post.images)
    ? post.images.map((img: any) => buildImageUrl(img.url) ?? "").filter(Boolean)
    : [];

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
          {images.length > 0 && (
            <ImageCarousel
              images={images}
              title={post.title}
              onTap={(i) => setLightboxIndex(i)}
              activeIndex={carouselIndex}
              setActiveIndex={setCarouselIndex}
            />
          )}

          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-xl font-semibold">{post.title}</h2>
              {post.store && (
                <p className="text-sm text-neutral-600">
                  <Link
                    to={`/store/${post.store.id}`}
                    className="hover:underline text-primary font-medium"
                    data-testid="link-store-name"
                  >
                    {post.store.name}
                  </Link>
                  {" · "}
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
                  {typeof remainingRaw === "string" ? remainingRaw : "Tilboð í gangi"}
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
                <span className="font-medium text-neutral-700">{post.category}</span>
              </p>
            )}

            <CartButton postId={post.id} />

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

      {lightboxIndex !== null && (
        <Lightbox
          images={images}
          title={post.title}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

function CartButton({ postId }: { postId: string }) {
  const { isInCart, toggleCart } = useCart();
  const saved = isInCart(postId);

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      className="w-full rounded-xl"
      onClick={() => toggleCart(postId)}
      data-testid="button-cart-detail"
    >
      {saved ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Vistað í körfu
        </>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4 mr-2" />
          Vista í körfu
        </>
      )}
    </Button>
  );
}
