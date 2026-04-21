import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Check } from "lucide-react";
import type { SalePostWithDetails } from "@shared/schema";
import { API_BASE_URL } from "@/lib/api";
import { useCart } from "@/hooks/useCart";

type Props = {
  post: SalePostWithDetails;
};

type ImageLike =
  | string
  | { url?: string | null; alt?: string | null }
  | null
  | undefined;

function buildImageUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;
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

function pickFirstImage(images: unknown): {
  url: string | null;
  alt: string | null;
} {
  const arr = Array.isArray(images) ? (images as ImageLike[]) : [];
  for (const item of arr) {
    if (!item) continue;
    if (typeof item === "string") {
      const s = item.trim();
      if (s) return { url: s, alt: null };
      continue;
    }
    if (typeof item === "object" && item !== null) {
      const u = (item as any).url;
      const a = (item as any).alt;
      const url = typeof u === "string" ? u.trim() : "";
      const alt = typeof a === "string" ? a.trim() : "";
      if (url) return { url, alt: alt || null };
    }
  }
  return { url: null, alt: null };
}

export function SalePostCard({ post }: Props) {
  const { url: rawImage, alt: imageAlt } = pickFirstImage(
    (post as any).images,
  );
  const imageUrl = buildImageUrl(rawImage);
  const { isInCart, toggleCart } = useCart();
  const navigate = useNavigate();
  const saved = isInCart(post.id);

  const discountPercent =
    typeof post.priceOriginal === "number" &&
    typeof post.priceSale === "number" &&
    post.priceOriginal > 0 &&
    post.priceSale > 0 &&
    post.priceSale < post.priceOriginal
      ? Math.round(
          ((post.priceOriginal - post.priceSale) / post.priceOriginal) * 100,
        )
      : null;

  return (
    <div className="relative rounded-2xl overflow-visible shadow-md bg-card border border-border hover:scale-[1.01] hover:shadow-lg transition-transform duration-150">
      <Link to={`/post/${post.id}`} className="block">
        <div className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-900 rounded-t-2xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={imageAlt || post.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = "none";
                const parent = el.parentElement;
                if (parent && !parent.querySelector(".img-fallback")) {
                  const fb = document.createElement("div");
                  fb.className = "img-fallback absolute inset-0 flex items-center justify-center text-xs text-neutral-400 bg-neutral-100";
                  fb.textContent = post.title?.slice(0, 20) ?? "Mynd";
                  parent.appendChild(fb);
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400 bg-neutral-100">
              Engin mynd
            </div>
          )}

          {discountPercent !== null && (
            <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
              -{discountPercent}%
            </div>
          )}
        </div>

        <div className="p-3 space-y-1">
          {post.store && (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/store/${post.store!.id}`);
              }}
              className="inline-block text-[10px] uppercase tracking-wide text-neutral-500 hover:underline cursor-pointer"
            >
              {post.store.name}
            </span>
          )}

          <h3 className="font-semibold text-sm text-neutral-900 line-clamp-1">
            {post.title}
          </h3>

          {post.description && (
            <p className="text-xs text-neutral-600 line-clamp-2">
              {post.description}
            </p>
          )}

          <div className="pt-1.5 flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1.5">
              {post.priceSale != null && (
                <span className="text-sm font-bold text-primary">
                  {post.priceSale.toLocaleString("is-IS")} kr
                </span>
              )}
              {post.priceOriginal != null && (
                <span className="text-[11px] line-through text-neutral-400">
                  {post.priceOriginal.toLocaleString("is-IS")} kr
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleCart(post.id);
        }}
        className={`absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm ${
          saved
            ? "bg-primary text-primary-foreground"
            : "bg-white/90 text-neutral-600 hover:bg-primary/10"
        }`}
        data-testid={`button-cart-${post.id}`}
        title={saved ? "Fjarlægja úr körfu" : "Vista í körfu"}
      >
        {saved ? (
          <Check className="w-4 h-4" />
        ) : (
          <ShoppingCart className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
