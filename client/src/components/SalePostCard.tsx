// client/src/components/SalePostCard.tsx
import { Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";

function getImageUrl(post: SalePostWithDetails): string {
  const anyPost = post as any;

  // Reynum nokkra mögulega reiti sem gætu innihaldið myndaslóð
  return (
    anyPost.imageUrl ||
    anyPost.image ||
    anyPost.mainImageUrl ||
    (post as any).image_urls?.[0] ||
    (post as any).imageUrls?.[0] ||
    post.images?.[0]?.url ||
    // Fallback – örugg, ytri mynd sem er alltaf til
    "https://images.pexels.com/photos/3951628/pexels-photo-3951628.jpeg?auto=compress&cs=tinysrgb&w=600"
  );
}

export function SalePostCard({ post }: { post: SalePostWithDetails }) {
  const imageSrc = getImageUrl(post);

  return (
    <Link
      to={`/posts/${post.id}`}
      className="block bg-white rounded-xl overflow-hidden shadow-sm"
    >
      <div className="relative">
        <img
          src={imageSrc}
          alt={post.title}
          className="w-full h-32 object-cover"
        />

        {/** Ef afsláttur er til staðar */}
        {(post as any).discount && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            -{(post as any).discount}%
          </span>
        )}
      </div>

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
          <p className="text-orange-600 text-lg font-bold leading-none">
            {post.priceSale != null
              ? `ISK ${post.priceSale.toLocaleString()}`
              : ""}
          </p>
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
