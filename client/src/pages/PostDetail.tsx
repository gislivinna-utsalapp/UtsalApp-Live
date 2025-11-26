// client/src/pages/PostDetail.tsx

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { SalePostWithDetails } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, getTimeRemaining, calculateDiscount } from "@/lib/utils";

export default function PostDetail() {
  const { id } = useParams();
  const [post, setPost] = useState<SalePostWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/posts/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Fann ekki útsölutilboð.");
        } else {
          setPost(data);
        }
      } catch (err) {
        setError("Villa kom upp við að sækja tilboð.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen p-6 pb-24">
        <p className="text-sm text-muted-foreground">Sæki tilboð...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen p-6 pb-24">
        <Card className="p-4 text-sm text-destructive">{error}</Card>
      </div>
    );
  }

  const mainImage = post.images?.[0];
  const discount = calculateDiscount(post.priceOriginal, post.priceSale);
  const timeRemaining = getTimeRemaining(post.endsAt);

  return (
    <div className="min-h-screen pb-24">
      {/* Haus */}
      <header className="p-4 border-b border-border">
        <Link to="/" className="text-sm text-pink-600 font-medium">
          ← Til baka
        </Link>
        <h1 className="text-xl font-bold mt-2">{post.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {post.store?.name ?? "Ótilgreind verslun"}
        </p>
      </header>

      {/* Efni */}
      <main className="p-4 max-w-2xl mx-auto space-y-4">
        {/* Myndarammi */}
        <div className="relative w-full h-48 md:h-64 bg-muted overflow-hidden rounded-xl border">
          {mainImage ? (
            <img
              src={mainImage.url}
              alt={mainImage.alt ?? post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Engin mynd
            </div>
          )}

          {discount > 0 && (
            <div className="absolute top-3 right-3 bg-pink-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
              -{discount}%
            </div>
          )}
        </div>

        {/* Upplýsingar */}
        <Card className="p-4 space-y-3">
          <div>
            <div className="text-lg font-bold text-pink-600">
              {formatPrice(post.priceSale)}
            </div>
            <div className="text-sm text-muted-foreground line-through">
              {formatPrice(post.priceOriginal)}
            </div>
          </div>

          {post.description && (
            <p className="text-sm leading-relaxed">{post.description}</p>
          )}

          {/* Tími og skoðanir */}
          <div className="text-xs text-muted-foreground flex items-center justify-between pt-2 border-t">
            <span>{timeRemaining}</span>
            <span>{post.viewCount ?? 0} skoðanir</span>
          </div>

          {/* Kaupa */}
          {post.buyUrl && (
            <a href={post.buyUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full text-sm mt-2">Kaupa vöruna</Button>
            </a>
          )}
        </Card>
      </main>
    </div>
  );
}
