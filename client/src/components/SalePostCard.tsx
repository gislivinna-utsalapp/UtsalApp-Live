import { Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";
import { API_BASE_URL } from "@/lib/api";
import { formatPrice, calculateDiscount } from "@/lib/utils";

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

  if (API_BASE_URL) {
    const base = API_BASE_URL.endsWith("/")
      ? API_BASE_URL.slice(0, -1)
      : API_BASE_URL;
    const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return `${base}${path}`;
  }

  return rawUrl;
}

export function SalePostCard({ post }: Props) {
  const firstImage = post.images?.[0];
  const imageUrl = buildImageUrl(firstImage?.url ?? null);

  // NÝTT: reiknum afsláttarprósentu fyrir kortið
  const discount =
    post.priceOriginal && post.priceSale
      ? calculateDiscount(post.priceOriginal, post.priceSale)
      : null;

  return (
    <Link to={`/post/${post.id}`} className="block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        {/* Myndabox – Boozt-style: stöðugt hlutfall + object-cover */}
        <div className="relative w-full aspect-[3/4] bg-gray-100 overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={firstImage?.alt || post.title}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              Engin mynd skráð
            </div>
          )}

          {/* NÝTT: Afsláttur í % ofan á myndina */}
          {discount && (
            <div className="absolute top-1.5 left-1.5 rounded-full bg-black/80 text-white text-[11px] font-bold px-2 py-1">
              -{discount}%
            </div>
          )}
        </div>

        {/* Texti + verð fyrir neðan */}
        <div className="flex flex-1 flex-col gap-1 p-2">
          <p className="text-xs font-semibold text-gray-900 line-clamp-2">
            {post.title}
          </p>

          {(post.priceSale ?? post.priceOriginal) && (
            <div className="flex items-baseline gap-1">
              {post.priceSale && (
                <span className="text-sm font-bold text-[#fc7102]">
                  {formatPrice(post.priceSale)}
                </span>
              )}

              {post.priceOriginal && (
                <span className="text-[11px] text-gray-400 line-through">
                  {formatPrice(post.priceOriginal)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
