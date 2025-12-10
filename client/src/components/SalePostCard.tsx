// client/src/components/SalePostCard.tsx

import { Link, useNavigate } from "react-router-dom";
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

// Hjálparfall til að reikna tíma sem er eftir af tilboði út frá endsAt
function getTimeLeft(endsAt?: string | null): string | null {
  if (!endsAt) return null;

  const end = new Date(endsAt);
  if (isNaN(end.getTime())) return null;

  const now = new Date();
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Tilboðinu er lokið";
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `Endar eftir ${days} daga og ${hours} klst`;
  }

  if (hours > 0) {
    return `Endar eftir ${hours} klst og ${minutes} mín`;
  }

  return `Endar eftir ${minutes} mín`;
}

export function SalePostCard({ post }: Props) {
  const navigate = useNavigate();

  const firstImage = post.images?.[0];
  const imageUrl = buildImageUrl(firstImage?.url ?? null);

  // Afsláttur í %
  const rawDiscount =
    post.priceOriginal != null && post.priceSale != null
      ? calculateDiscount(post.priceOriginal, post.priceSale)
      : null;

  const discount = typeof rawDiscount === "number" ? rawDiscount : null;

  // Lýsing (tekin ef hún er til – annars tómur strengur)
  const rawDescription = (post as any).description ?? (post as any).body ?? "";
  const description =
    typeof rawDescription === "string" ? rawDescription.trim() : "";

  // Tími sem er eftir – byggt á endsAt sem kemur frá server
  const timeLeftLabel = getTimeLeft((post as any).endsAt ?? null);

  // NÝTT: tryggjum að við eigum storeId til að fara á prófíl
  const storeId =
    (post as any).storeId ??
    (post as any).store?.id ??
    (post as any).store_id ??
    null;

  return (
    <Link to={`/post/${post.id}`} className="block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-xl bg-white shadow-sm">
        {/* NAFN FYRIRTÆKIS EFST Í BOXINU – NÚ VERÐUR CLICKABLE Á PRÓFÍL */}
        {post.store && post.store.name && (
          <div className="px-2 pt-2 pb-1">
            <button
              type="button"
              className="text-[11px] font-semibold text-gray-700 line-clamp-1 underline-offset-2 hover:underline text-left"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (storeId) {
                  navigate(`/store/${storeId}`);
                }
              }}
            >
              {post.store.name}
            </button>
          </div>
        )}

        {/* Myndabox – kassalagað (4/3) */}
        <div className="relative w-full aspect-[4/3] bg-gray-100 overflow-hidden">
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

          {/* Afsláttur í % ofan á myndina */}
          {discount !== null && discount > 0 && (
            <div className="absolute top-1.5 left-1.5 rounded-full bg-black/80 text-white text-[11px] font-bold px-2 py-1">
              -{discount}%
            </div>
          )}
        </div>

        {/* Texti + verð fyrir neðan */}
        <div className="flex flex-1 flex-col gap-1 p-2">
          {/* Titill */}
          <p className="text-xs font-semibold text-gray-900 line-clamp-2">
            {post.title}
          </p>

          {/* Lýsing */}
          {description && (
            <p className="text-[11px] leading-tight text-gray-700 line-clamp-3">
              {description}
            </p>
          )}

          {/* Verðupplýsingar */}
          {(post.priceSale ?? post.priceOriginal) && (
            <div className="mt-1 flex items-baseline gap-1">
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

          {/* Tími sem er eftir af tilboði */}
          {timeLeftLabel && (
            <div className="mt-0.5 text-[11px] font-medium text-red-600">
              {timeLeftLabel}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
