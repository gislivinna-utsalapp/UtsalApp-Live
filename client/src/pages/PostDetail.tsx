// client/src/pages/PostDetail.tsx

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { SalePostWithDetails } from "@shared/schema";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { formatPrice, calculateDiscount, getTimeRemaining } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";

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

// ── Image carousel ─────────────────────────────────────────────────────────────

function ImageCarousel({
  images,
  title,
  onTap,
}: {
  images: string[];
  title: string;
  onTap: (index: number) => void;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = () => setActiveIndex((i) => Math.max(0, i - 1));
  const next = () => setActiveIndex((i) => Math.min(images.length - 1, i + 1));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? next() : prev();
    }
    touchStartX.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-900 select-none"
      style={{ aspectRatio: "4/5" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides — each absolutely fills the container, offset by index */}
      {images.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-transform duration-300 ease-in-out cursor-zoom-in"
          style={{ transform: `translateX(${(i - activeIndex) * 100}%)` }}
          onClick={() => onTap(i)}
        >
          <img
            src={src}
            alt={`${title} - mynd ${i + 1}`}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ))}

      {images.length > 1 && (
        <>
          {/* Prev arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            disabled={activeIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white disabled:opacity-25 transition-opacity"
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Next arrow */}
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            disabled={activeIndex === images.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 rounded-full p-1.5 text-white disabled:opacity-25 transition-opacity"
            data-testid="button-carousel-next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === activeIndex ? "20px" : "8px",
                  height: "8px",
                  background: i === activeIndex ? "#ffffff" : "rgba(255,255,255,0.5)",
                }}
                data-testid={`button-dot-${i}`}
              />
            ))}
          </div>

          {/* Counter badge */}
          <div className="absolute top-3 right-3 z-10 bg-black/50 rounded-full px-2 py-0.5 text-xs text-white">
            {activeIndex + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}

// ── Fullscreen lightbox ────────────────────────────────────────────────────────

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
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white text-sm">{current + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white p-1" data-testid="button-lightbox-close">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image area */}
      <div className="flex-1 relative overflow-hidden flex items-center">
        {images.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center px-2 transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(${(i - current) * 100}%)` }}
          >
            <img
              src={src}
              alt={`${title} - mynd ${i + 1}`}
              className="max-w-full max-h-full object-contain"
              draggable={false}
            />
          </div>
        ))}

        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              disabled={current === 0}
              className="absolute left-2 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white disabled:opacity-20"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={next}
              disabled={current === images.length - 1}
              className="absolute right-2 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white disabled:opacity-20"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto justify-center flex-shrink-0">
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

// ── Cart button ────────────────────────────────────────────────────────────────

function CartButton({ postId }: { postId: string }) {
  const { isInCart, addToCart, removeFromCart } = useCart();
  const { toast } = useToast();
  const saved = isInCart(postId);

  const handleClick = () => {
    if (saved) {
      removeFromCart(postId);
      toast({ title: "Fjarlægt úr körfu" });
    } else {
      addToCart(postId);
      toast({ title: "Vistað í körfu" });
    }
  };

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      className="w-full rounded-xl"
      onClick={handleClick}
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

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  const { data: post, isLoading, error } = useQuery({
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
    ? (post.images as any[])
        .map((img) => buildImageUrl(img?.url))
        .filter((u): u is string => !!u)
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
                <div className="text-2xl font-bold">{formatPrice(post.priceSale)}</div>
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
