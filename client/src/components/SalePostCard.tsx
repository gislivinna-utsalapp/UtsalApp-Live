// client/src/components/SalePostCard.tsx
import { Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";

export function SalePostCard({ post }: { post: SalePostWithDetails }) {
  // Reynum að ná í fyrstu myndina úr post.images
  const mainImage =
    post.images && post.images.length > 0 ? post.images[0].url : null;

  // Fallback mynd ef engin mynd er í gagnagrunninum
  const imageSrc =
    mainImage ||
    "https://images.pexels.com/photos/3951628/pexels-photo-3951628.jpeg?auto=compress&cs=tinysrgb&w=600";

  return (
    <Link
      to={`/posts/${post.id}`}
      className="block bg-white rounded-xl overflow-hidden shadow-sm"
    >
      {/* Myndahlutinn */}
      <div className="relative">
        <img
          src={imageSrc}
          alt={post.title}
          className="w-full h-32 object-cover"
          loading="lazy"
          onError={(e) => {
            // Ef slóðin er röng/comeback 404 → setjum fallback mynd
            (e.currentTarget as HTMLImageElement).src =
              "https://images.pexels.com/photos/3951628/pexels-photo-3951628.jpeg?auto=compress&cs=tinysrgb&w=600";
          }}
        />
      </div>

      {/* Texti / upplýsingar */}
      <div className="p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {(post as any).storeName || (post as any).store?.name || ""}
        </p>

        <h3 className="text-sm font-bold mt-1">
          {post.title.length > 26
            ? post.title.slice(0, 26) + "..."
            : post.title}
        </h3>

        <p className="text-xs text-gray-600 mt-1">
          {post.description?.slice(0, 40) || ""}
        </p>

        <div className="mt-2">
          {post.priceSale != null && (
            <p className="text-orange-600 text-lg font-bold leading-none">
              ISK {post.priceSale.toLocaleString()}
            </p>
          )}
          {post.priceOriginal != null && (
            <p className="text-gray-400 text-xs line-through mt-0.5">
              ISK {post.priceOriginal.toLocaleString()}
            </p>
          )}
        </div>

        <p className="text-[10px] text-gray-500 mt-1">
          {(post as any).viewCount ?? 0} skoðanir
        </p>
      </div>
    </Link>
  );
}
