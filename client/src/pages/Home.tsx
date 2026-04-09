// client/src/pages/Home.tsx
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { PromoBanner } from "@/components/PromoBanner";
import { Card } from "@/components/ui/card";

const BANNER_INTERVAL = 8;

async function fetchPosts(): Promise<SalePostWithDetails[]> {
  return apiFetch<SalePostWithDetails[]>("/api/v1/posts");
}

export default function Home() {
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "home"],
    queryFn: fetchPosts,
  });

  const feedItems: Array<
    | { type: "post"; post: SalePostWithDetails }
    | { type: "banner"; key: string; variant: "fermingar" | "subscription" }
  > = [];

  if (Array.isArray(posts)) {
    let bannerCount = 0;
    posts.forEach((post, index) => {
      feedItems.push({ type: "post", post });
      if ((index + 1) % BANNER_INTERVAL === 0 && index + 1 < posts.length) {
        const variant = bannerCount % 2 === 0 ? "fermingar" : "subscription";
        feedItems.push({ type: "banner", key: `banner-${index}`, variant });
        bannerCount++;
      }
    });
  }

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      {/* Toppurinn með % og texta */}
      <header className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg">
          <span className="text-3xl font-extrabold text-white">%</span>
        </div>

        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">ÚtsalApp</h1>
          <p className="text-sm text-gray-200">
            Allar útsölur og bestu tilboðin nálægt þér.
          </p>
        </div>
      </header>

      {isLoading && (
        <Card className="p-4">
          <p>Er að hlaða tilboðum...</p>
        </Card>
      )}

      {error && (
        <Card className="p-4">
          <p>Villa kom upp við að sækja tilboð.</p>
        </Card>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <Card className="p-4">
          <p>Engin tilboð skráð ennþá.</p>
        </Card>
      )}

      {!isLoading && !error && feedItems.length > 0 && (
        <section>
          <div className="grid grid-cols-2 gap-3">
            {feedItems.map((item) =>
              item.type === "banner" ? (
                <PromoBanner key={item.key} variant={item.variant} />
              ) : (
                <SalePostCard key={item.post.id} post={item.post} />
              )
            )}
          </div>
        </section>
      )}
    </main>
  );
}
