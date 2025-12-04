// client/src/pages/CategoriesPage.tsx
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function fetchPosts(): Promise<SalePostWithDetails[]> {
  return apiFetch<SalePostWithDetails[]>("/api/v1/posts");
}

// Grunnflokkar – samræmdir við CreatePost.tsx
const BASE_CATEGORIES = [
  "Fatnaður - Konur",
  "Fatnaður - Karlar",
  "Fatnaður - Börn",
  "Skór",
  "Íþróttavörur",
  "Heimili & húsgögn",
  "Raftæki",
  "Snyrtivörur",
  "Leikföng & börn",
  "Matur & veitingar",
  "Happy Hour",
  "Annað",
];

function normalizeCategory(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

export default function CategoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "categories"],
    queryFn: fetchPosts,
  });

  const filteredPosts = useMemo(() => {
    if (!selectedCategory) return posts;

    const target = normalizeCategory(selectedCategory);
    return posts.filter((post) => {
      const cat = normalizeCategory(post.category ?? null);
      return cat === target;
    });
  }, [posts, selectedCategory]);

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-white">Flokkar</h1>
        <p className="text-sm text-gray-300">
          Veldu flokk til að sjá tilboðin sem passa.
        </p>
      </header>

      {/* Flokkar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          Allt
        </Button>

        {BASE_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
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
          <p>Engin tilboð í þessum flokki eins og er.</p>
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
