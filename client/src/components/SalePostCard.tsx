// client/src/components/SalePostCard.tsx
import { Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";
import { API_BASE_URL } from "@/lib/api";

type Props = {
  post: SalePostWithDetails;
};

// Hjálparfall til að byggja rétta myndaslóð
function buildImageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;

  // Ef hún er nú þegar absolute (http/https) – skilar beint
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl;
  }

  // Ef við höfum API_BASE_URL (Netlify / production)
  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${base}${path}`;
  }

  // Fallback: relative slóð (virkar í Replit dev þar sem frontend+backend eru á sama host)
  return rawUrl;
}

export function SalePostCard({ post }: Props) {
  const imageUrl = buildImageUrl(post.images?.[0]?.url ?? null);

  const discountPercent =
    post.priceOriginal && post.priceSale
      ? Math.round(
          ((post.priceOriginal - post.priceSale) / post.priceOriginal) * 100,
        )
      : null;

  return (
    <Link
      to={`/post/${post.id}`}
      className="block rounded-2xl overflow-hidden shadow-md bg-card border border-border hover:scale-[1.01] hover:shadow-lg transition-transform duration-150"
    >
      <div className="relative h-36 w-full overflow-hidden bg-neutral-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={post.images?.[0]?.alt || post.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-xs text-neutral-400">
            Engin mynd skráð
          </div>
        )}

        {discountPercent !== null && (
          <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
            -{discountPercent}%
          </div>
        )}
      </div>

      <div className="p-3 space-y-1">
        {post.store && (
          <p className="text-[10px] uppercase tracking-wide text-neutral-500">
            {post.store.name}
          </p>
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

        {typeof post.viewCount === "number" && (
          <p className="mt-0.5 text-[10px] text-neutral-500">
            {post.viewCount} skoðanir
          </p>
        )}
      </div>
    </Link>
  );
}
