import { Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";
import { API_BASE_URL } from "@/lib/api";

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
    const base = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return `${base}${p}`;
  }
  return rawPath;
}

function pickFirstImage(images: unknown): { url: string | null; alt: string | null } {
  const arr = Array.isArray(images) ? (images as ImageLike[]) : [];
  for (const item of arr) {
    if (!item) continue;
    if (typeof item === "string") {
      const s = item.trim();
      if (s) return { url: s, alt: null };
      continue;
    }
    if (typeof item === "object") {
      const u = (item as any).url;
      const a = (item as any).alt;
      const url = typeof u === "string" ? u.trim() : "";
      if (url) return { url, alt: typeof a === "string" ? a.trim() : null };
    }
  }
  return { url: null, alt: null };
}

export function SalePostCard({ post }: Props) {
  const { url: rawImage, alt: imageAlt } = pickFirstImage((post as any).images);
  const imageUrl = buildImageUrl(rawImage);

  const discountPercent =
    typeof post.priceOriginal === "number" &&
    typeof post.priceSale === "number" &&
    post.priceOriginal > 0 &&
    post.priceSale > 0 &&
    post.priceSale < post.priceOriginal
      ? Math.round(((post.priceOriginal - post.priceSale) / post.priceOriginal) * 100)
      : null;

  return (
    <Link
      to={`/post/${post.id}`}
      className="block bg-white"
      data-testid={`card-post-${post.id}`}
    >
      {/* Image */}
      <div className="relative w-full overflow-hidden bg-neutral-100" style={{ aspectRatio: "3/4" }}>
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
          <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
            Engin mynd
          </div>
        )}

        {/* Discount badge — top left, small */}
        {discountPercent !== null && (
          <div className="absolute top-0 left-0 bg-[#ff4d00] text-white text-[10px] font-bold px-1.5 py-0.5">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="pt-1.5 pb-2 px-0.5 space-y-0.5">
        {post.store && (
          <p className="text-[10px] text-neutral-400 truncate uppercase tracking-wide">
            {post.store.name}
          </p>
        )}
        <p className="text-xs text-neutral-800 leading-tight line-clamp-2 font-medium">
          {post.title}
        </p>
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-[#ff4d00]">
            {typeof post.priceSale === "number"
              ? `${post.priceSale.toLocaleString("is-IS")} kr.`
              : ""}
          </span>
          {post.priceOriginal && post.priceOriginal > post.priceSale && (
            <span className="text-[10px] text-neutral-400 line-through">
              {post.priceOriginal.toLocaleString("is-IS")} kr.
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
