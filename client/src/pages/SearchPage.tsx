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
      const description = (post as any).description ?? (post as any).body ?? "";
      const haystack = `${title} ${description}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query]);

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header>
        <h1 className="text-xl font-semibold text-foreground">Leit</h1>
        <p className="text-sm text-muted-foreground">
          Finndu tilboð eftir titli eða lýsingu.
        </p>
      </header>

      <div>
        <Input
          placeholder="Sláðu inn leitarorð..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-card text-foreground border border-border"
        />
      </div>

      {isLoading && (
        <Card className="p-4 bg-card text-card-foreground border border-border">
          <p className="text-sm text-muted-foreground">
            Er að hlaða tilboðum...
          </p>
        </Card>
      )}

      {error && (
        <Card className="p-4 bg-card text-card-foreground border border-border">
          <p className="text-sm text-muted-foreground">
            Villa kom upp við að sækja tilboð.
          </p>
        </Card>
      )}

      {!isLoading && !error && filteredPosts.length === 0 && (
        <Card className="p-4 bg-card text-card-foreground border border-border">
          <p className="text-sm text-muted-foreground">
            Engin tilboð fundust fyrir þessa leit.
          </p>
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
