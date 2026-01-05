// client/src/pages/SearchPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

async function fetchPosts(): Promise<SalePostWithDetails[]> {
  return apiFetch<SalePostWithDetails[]>("/api/v1/posts");
}

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "search"],
    queryFn: fetchPosts,
  });

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;

    return posts.filter((post) => {
      const title = post.title ?? "";
      const description = post.description ?? "";
      const haystack = `${title} ${description}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query]);

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-white">Leit</h1>
      </header>

      <div>
        <Input
          placeholder="Sláðu inn leitarorð..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

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

      {!isLoading && !error && filteredPosts.length === 0 && (
        <Card className="p-4">
          <p>Engin tilboð fundust fyrir þessa leit.</p>
        </Card>
      )}

      {!isLoading && !error && filteredPosts.length > 0 && (
        <section>
          <div className="grid grid-cols-2 gap-3">
            {filteredPosts.map((post) => (
              <SalePostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
