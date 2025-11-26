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

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white flex flex-col">
      {/* Mynd efst */}
      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
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
      <div className="p-4 flex flex-col gap-1">
        <h3 className="font-semibold text-lg leading-snug line-clamp-2">
          {post?.title || "Útsala"}
        </h3>

        {post?.store?.name && (
          <p className="text-sm text-gray-500">{post.store.name}</p>
        )}

        {post?.shortDescription && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {post.shortDescription}
          </p>
        )}
      </div>
    </div>
  );
}
