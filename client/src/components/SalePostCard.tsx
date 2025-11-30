import { Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";

export function SalePostCard({ post }: { post: SalePostWithDetails }) {
  return (
    <Link
      to={`/posts/${post.id}`}
      className="block bg-white rounded-xl overflow-hidden shadow-sm"
    >
      <div className="relative">
        <img
          src={post.images?.[0]?.url || "/placeholder.jpg"}
          alt={post.title}
          className="w-full h-32 object-cover"
        />

        {post.discount && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            -{post.discount}%
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {post.storeName}
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
          <p className="text-orange-600 text-lg font-bold leading-none">
            ISK {post.priceSale?.toLocaleString()}
          </p>
          <p className="text-gray-400 text-xs line-through mt-0.5">
            ISK {post.priceOriginal?.toLocaleString()}
          </p>
        </div>

        <p className="text-[10px] text-gray-500 mt-1">
          {post.viewCount ?? 0} skoðanir
        </p>
      </div>
    </Link>
  );
}
