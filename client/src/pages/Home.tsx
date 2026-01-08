// client/src/pages/Home.tsx
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Card } from "@/components/ui/card";

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

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      {/* Toppurinn með % og texta */}
      <header className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg">
          <span className="text-3xl font-extrabold text-black">%</span>
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

      {!isLoading && !error && Array.isArray(posts) && posts.length > 0 && (
        <section>
          {/* HÉR er nýja grid-ið:
              2 dálkar, minni gap => nettari og jafnari gluggar */}
          <div className="grid grid-cols-2 gap-3">
            {posts.map((post) => (
              <SalePostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
