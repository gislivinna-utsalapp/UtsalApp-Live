import React from "react";

const PLACEHOLDER_IMAGE = "https://via.placeholder.com/800x500.png?text=Útsala";

type SalePostCardProps = {
  post: any;
};

export function SalePostCard({ post }: SalePostCardProps) {
  const mainImageUrl =
    post?.imageUrl ||
    post?.images?.[0]?.url ||
    post?.store?.logoUrl ||
    PLACEHOLDER_IMAGE;

  // Reikna afslátt í prósentum ef við höfum verð
  const original = Number(post?.priceOriginal);
  const sale = Number(post?.priceSale);

  let discountPercent: number | null = null;

  if (
    Number.isFinite(original) &&
    Number.isFinite(sale) &&
    original > 0 &&
    sale > 0 &&
    sale < original
  ) {
    discountPercent = Math.round(((original - sale) / original) * 100);
  }

  return (
    <div
      className="
        overflow-hidden 
        rounded-2xl 
        border border-neutral-200 
        bg-white 
        flex flex-col 

        shadow-[0_0_28px_rgba(255,122,26,0.55),0_6px_18px_rgba(0,0,0,0.45)]
      "
    >
      {/* Mynd */}
      <div className="relative w-full h-40 sm:h-44 overflow-hidden bg-neutral-100">
        {/* Afsláttar-prósenta badge */}
        {discountPercent !== null && (
          <div
            className="
              absolute 
              top-2 right-2 
              rounded-full 
              px-3 py-1 
              text-xs sm:text-sm 
              font-bold 
              bg-[#FF7300] 
              text-white 
              shadow-md
            "
          >
            -{discountPercent}%
          </div>
        )}

        <img
          src={mainImageUrl}
          alt={post?.title || "Útsala"}
          className="w-full h-full object-cover"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.src = PLACEHOLDER_IMAGE;
          }}
        />
      </div>

      {/* Texti */}
      <div className="px-3 pb-4 pt-3 flex flex-col gap-1 text-black min-h-[90px]">
        <h3 className="font-semibold text-base sm:text-lg leading-snug line-clamp-2">
          {post?.title || "Útsala"}
        </h3>

        {post?.store?.name && (
          <p className="text-xs sm:text-sm text-neutral-600">
            {post.store.name}
          </p>
        )}

        {post?.shortDescription && (
          <p className="text-xs sm:text-sm text-neutral-700 line-clamp-2">
            {post.shortDescription}
          </p>
        )}
      </div>
    </div>
  );
}
