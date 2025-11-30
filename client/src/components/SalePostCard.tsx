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
      className="block rounded-[32px] overflow-hidden shadow-xl bg-white/95 border border-orange-900/40 hover:scale-[1.01] hover:shadow-2xl transition-transform duration-150"
    >
      <div className="relative h-48 w-full overflow-hidden bg-neutral-900">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={post.images?.[0]?.alt || post.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-neutral-400">
            Engin mynd skráð
          </div>
        )}

        {discountPercent !== null && (
          <div className="absolute top-3 right-3 bg-[#FF7A00] text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            -{discountPercent}%
          </div>
        )}
      </div>

      <div className="p-4 space-y-1">
        {post.store && (
          <p className="text-xs uppercase tracking-wide text-neutral-500">
            {post.store.name}
          </p>
        )}
        <h3 className="font-semibold text-base text-neutral-900 line-clamp-1">
          {post.title}
        </h3>
        {post.description && (
          <p className="text-sm text-neutral-600 line-clamp-2">
            {post.description}
          </p>
        )}

        <div className="pt-2 flex items-baseline gap-2">
          {post.priceSale != null && (
            <span className="text-base font-bold text-[#FF7A00]">
              ISK {post.priceSale.toLocaleString("is-IS")}
            </span>
          )}
          {post.priceOriginal != null && (
            <span className="text-xs line-through text-neutral-400">
              ISK {post.priceOriginal.toLocaleString("is-IS")}
            </span>
          )}
        </div>

        {typeof post.viewCount === "number" && (
          <p className="mt-1 text-[11px] text-neutral-500">
            {post.viewCount} skoðanir
          </p>
        )}
      </div>
    </Link>
  );
}
