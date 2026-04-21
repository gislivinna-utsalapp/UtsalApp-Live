// client/src/pages/PostDetail.tsx

import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Heart, Share2, ShoppingBag } from "lucide-react";
import type { SalePostWithDetails } from "@shared/schema";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { getTimeRemaining } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";

function buildImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    return `${base}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  }
  return rawUrl;
}

// ── Image carousel ──────────────────────────────────────────────────────────────

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

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) diff > 0 ? next() : prev();
    touchStartX.current = null;
  };

  if (images.length === 0) return null;

  return (
    <div
      className="relative w-full overflow-hidden bg-neutral-100 select-none"
      style={{ aspectRatio: "3/4" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {images.map((src, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(${(i - activeIndex) * 100}%)` }}
          onClick={() => onTap(i)}
        >
          <img
            src={src}
            alt={`${title} - mynd ${i + 1}`}
            className="w-full h-full object-cover cursor-zoom-in"
            draggable={false}
          />
        </div>
      ))}

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            disabled={activeIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 text-neutral-700 disabled:opacity-30 shadow-sm"
            data-testid="button-carousel-prev"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            disabled={activeIndex === images.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white/80 rounded-full p-1 text-neutral-700 disabled:opacity-30 shadow-sm"
            data-testid="button-carousel-next"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-3 right-3 z-10 bg-black/40 rounded-full px-2 py-0.5 text-[11px] text-white font-medium">
            {activeIndex + 1}/{images.length}
          </div>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setActiveIndex(i); }}
                className="rounded-full transition-all duration-200"
                style={{
                  width: i === activeIndex ? "16px" : "6px",
                  height: "6px",
                  background: i === activeIndex ? "#111" : "rgba(0,0,0,0.25)",
                }}
                data-testid={`button-dot-${i}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Fullscreen lightbox ─────────────────────────────────────────────────────────

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

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
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
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <span className="text-white text-sm">{current + 1} / {images.length}</span>
        <button onClick={onClose} className="text-white p-1" data-testid="button-lightbox-close">
          <X className="w-6 h-6" />
        </button>
      </div>
      <div className="flex-1 relative overflow-hidden flex items-center">
        {images.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center px-2 transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(${(i - current) * 100}%)` }}
          >
            <img src={src} alt={`${title} - mynd ${i + 1}`} className="max-w-full max-h-full object-contain" draggable={false} />
          </div>
        ))}
        {images.length > 1 && (
          <>
            <button onClick={prev} disabled={current === 0} className="absolute left-2 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white disabled:opacity-20">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={next} disabled={current === images.length - 1} className="absolute right-2 z-10 bg-white/10 hover:bg-white/20 rounded-full p-2 text-white disabled:opacity-20">
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto justify-center flex-shrink-0">
          {images.map((src, i) => (
            <button key={i} onClick={() => setCurrent(i)} className="flex-shrink-0 w-12 h-12 overflow-hidden border-2 transition-colors" style={{ borderColor: i === current ? "#fff" : "transparent" }} data-testid={`button-thumb-${i}`}>
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────────

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isInCart, addToCart, removeFromCart } = useCart();
  const { toast } = useToast();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxIndex(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex]);

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["post", id],
    enabled: !!id,
    queryFn: () => apiFetch<SalePostWithDetails>(`/api/v1/posts/${id}`),
  });

  if (!id || isLoading) {
    return (
      <div className="bg-white min-h-screen">
        <div className="w-full bg-neutral-100 animate-pulse" style={{ aspectRatio: "3/4" }} />
        <div className="p-4 space-y-3">
          <div className="h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-neutral-100 rounded animate-pulse w-1/2" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="p-8 text-center">
        <button onClick={() => navigate(-1)} className="text-sm text-neutral-600">← Til baka</button>
      </div>
    );
  }

  const discount =
    post.priceOriginal && post.priceSale && post.priceOriginal > post.priceSale
      ? Math.round(((post.priceOriginal - post.priceSale) / post.priceOriginal) * 100)
      : null;

  const remainingRaw = post.endsAt ? getTimeRemaining(post.endsAt) : null;
  const saved = isInCart(post.id);

  const images: string[] = Array.isArray(post.images)
    ? (post.images as any[])
        .map((img) => buildImageUrl(img?.url))
        .filter((u): u is string => !!u)
    : [];

  const handleBuy = () => {
    if ((post as any).buyUrl) {
      window.open((post as any).buyUrl, "_blank", "noopener,noreferrer");
    } else if (post.store?.id) {
      navigate(`/store/${post.store.id}`);
    }
  };

  const handleSave = () => {
    if (saved) {
      removeFromCart(post.id);
      toast({ title: "Fjarlægt úr vistunarlista" });
    } else {
      addToCart(post.id);
      toast({ title: "Vistað" });
    }
  };

  return (
    <div className="bg-white min-h-screen pb-28">
      {/* ── Sticky header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 flex items-center px-3 py-2.5 gap-2">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
          data-testid="button-back"
        >
          <ChevronLeft className="w-5 h-5 text-neutral-700" />
        </button>
        <h1 className="flex-1 text-sm font-semibold truncate text-neutral-800">
          {post.title}
        </h1>
        <button
          onClick={handleSave}
          className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
          data-testid="button-wishlist"
        >
          <Heart
            className={`w-5 h-5 ${saved ? "fill-[#ff4d00] text-[#ff4d00]" : "text-neutral-500"}`}
          />
        </button>
        <button
          className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: post.title, url: window.location.href });
            }
          }}
        >
          <Share2 className="w-5 h-5 text-neutral-500" />
        </button>
      </header>

      {/* ── Image ─────────────────────────────────────────────── */}
      {images.length > 0 ? (
        <ImageCarousel images={images} title={post.title} onTap={(i) => setLightboxIndex(i)} />
      ) : (
        <div className="w-full bg-neutral-100 flex items-center justify-center text-neutral-400 text-sm" style={{ aspectRatio: "3/4" }}>
          Engin mynd
        </div>
      )}

      {/* ── Product info ───────────────────────────────────────── */}
      <div className="px-4 py-3 space-y-3">

        {/* Store */}
        {post.store && (
          <Link
            to={`/store/${post.store.id}`}
            className="text-xs text-neutral-400 uppercase tracking-wider font-medium hover:text-neutral-600"
            data-testid="link-store-name"
          >
            {post.store.name}
          </Link>
        )}

        {/* Title */}
        <h2 className="text-base font-semibold text-neutral-900 leading-snug">
          {post.title}
        </h2>

        {/* Price row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-bold text-[#ff4d00]">
            {typeof post.priceSale === "number"
              ? `${post.priceSale.toLocaleString("is-IS")} kr.`
              : ""}
          </span>
          {post.priceOriginal && post.priceOriginal > post.priceSale && (
            <span className="text-sm text-neutral-400 line-through">
              {post.priceOriginal.toLocaleString("is-IS")} kr.
            </span>
          )}
          {discount && (
            <span className="bg-[#ff4d00] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm">
              -{discount}%
            </span>
          )}
        </div>

        {/* Time remaining */}
        {remainingRaw && (
          <p className="text-xs text-neutral-500 font-medium">
            {typeof remainingRaw === "string" ? remainingRaw : "Tilboð í gangi"}
          </p>
        )}

        {/* Divider */}
        <div className="border-t border-neutral-100" />

        {/* Description */}
        {post.description && (
          <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-line">
            {post.description}
          </p>
        )}

        {/* Category */}
        {post.category && (
          <p className="text-xs text-neutral-400">
            Flokkur: <span className="text-neutral-600 font-medium">{post.category}</span>
          </p>
        )}
      </div>

      {/* ── Sticky bottom buy bar ──────────────────────────────── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-100 px-3 py-3 flex gap-2"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <button
          onClick={handleSave}
          className={`flex-1 h-11 border rounded-sm flex items-center justify-center gap-2 text-sm font-semibold transition-colors
            ${saved
              ? "border-[#ff4d00] text-[#ff4d00] bg-orange-50"
              : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}
          data-testid="button-add-to-cart"
        >
          <ShoppingBag className="w-4 h-4" />
          {saved ? "Í körfu" : "Setja í körfu"}
        </button>
        <button
          onClick={handleBuy}
          className="flex-1 h-11 bg-neutral-900 text-white text-sm font-semibold rounded-sm flex items-center justify-center tracking-wide hover:bg-neutral-800 active:bg-neutral-700 transition-colors"
          data-testid="button-buy"
        >
          Skoða tilboð
        </button>
      </div>

      {/* ── Lightbox ───────────────────────────────────────────── */}
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
