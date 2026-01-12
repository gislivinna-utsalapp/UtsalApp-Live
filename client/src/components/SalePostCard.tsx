// client/src/components/SalePostCard.tsx
import { Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  post: SalePostWithDetails;
};

type ImageLike =
  | string
  | {
      url?: string | null;
      alt?: string | null;
    }
  | null
  | undefined;

function buildImageUrl(rawPath?: string | null): string | null {
  if (!rawPath) return null;

  // Absolute already
  if (/^https?:\/\//i.test(rawPath)) return rawPath;

  // Prefix with API base in production
  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const p = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
    return `${base}${p}`;
  }

  // Dev fallback (same host)
  return rawPath;
}

// Finnur fyrstu raunverulegu mynd úr images
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
  const { url: rawImage, alt: imageAlt } = pickFirstImage((post as any).images);
  const imageUrl = buildImageUrl(rawImage);

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
    <Link
      to={`/post/${post.id}`}
      className="block rounded-2xl overflow-hidden shadow-md bg-card border border-border hover:scale-[1.01] hover:shadow-lg transition-transform duration-150"
    >
      {/* MYNDARRAMMI */}
      <div className="relative w-full aspect-[4/5] overflow-hidden bg-neutral-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt || post.title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
            Engin mynd skráð
          </div>
        )}

        {discountPercent !== null && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
            -{discountPercent}%
          </div>
        )}
      </div>

      {/* TEXTABOX */}
      <div className="p-3 space-y-1">
        {post.store && (
          <Link
            to={`/store/${post.store.id}`}
            onClick={(e) => e.stopPropagation()} // 🔑 mikilvægast
            className="inline-block text-[10px] uppercase tracking-wide text-neutral-500 hover:underline"
          >
            {post.store.name}
          </Link>
        )}

        <h3 className="font-semibold text-sm text-neutral-900 line-clamp-1">
          {post.title}
        </h3>

        {post.description && (
          <p className="text-xs text-neutral-600 line-clamp-2">
            {post.description}
          </p>
        )}

        <div className="pt-1.5 flex items-baseline gap-1.5">
          {post.priceSale != null && (
            <span className="text-sm font-bold text-primary">
              ISK {post.priceSale.toLocaleString("is-IS")}
            </span>
          )}
          {post.priceOriginal != null && (
            <span className="text-[11px] line-through text-neutral-400">
              ISK {post.priceOriginal.toLocaleString("is-IS")}
            </span>
          )}
        </div>

        {/* viewCount fjarlægt af forsíðu */}
      </div>
    </Link>
  );
}
