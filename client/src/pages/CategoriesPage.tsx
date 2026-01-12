// client/src/pages/CategoriesPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

async function fetchPosts(): Promise<SalePostWithDetails[]> {
  return apiFetch<SalePostWithDetails[]>("/api/v1/posts");
}

// Grunnflokkar
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
  "Upplifun", // ✅ NÝR FLOKKUR
  "Annað",
];

// Normalizer
function normalizeCategory(raw: string | null | undefined): string {
  const c = (raw || "").trim();
  if (!c) return "";

  const lower = c.toLowerCase();

  if (lower.startsWith("rafmagn")) return "Raftæki";
  if (lower === "veitingar") return "Matur & veitingar";
  if (lower === "matur og veitingar") return "Matur & veitingar";
  if (lower === "snyrtivorur") return "Snyrtivörur";
  if (lower === "annad") return "Annað";
  if (lower === "heimili") return "Heimili & húsgögn";
  if (lower === "upplifun" || lower === "upplifanir") return "Upplifun";

  if (BASE_CATEGORIES.includes(c)) return c;

  return c.charAt(0).toUpperCase() + c.slice(1);
}

export default function CategoriesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", "categories"],
    queryFn: fetchPosts,
  });

  // 🔒 ALLTAF ARRAY
  const posts: SalePostWithDetails[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.posts)
      ? (data as any).posts
      : [];

  // 🔒 Normalized posts alltaf array
  const normalizedPosts = Array.isArray(posts)
    ? posts.map((p) => ({
        ...p,
        _normCategory: normalizeCategory(p.category),
      }))
    : [];

  // 🔒 Categories alltaf array
  const categories = Array.from(
    new Set([
      ...BASE_CATEGORIES,
      ...normalizedPosts
        .map((p) => p._normCategory)
        .filter((c) => typeof c === "string" && c.length > 0),
    ]),
  ).sort();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 🔒 VARNARFILTER
  const safePosts = Array.isArray(normalizedPosts) ? normalizedPosts : [];

  const visiblePosts =
    selectedCategory === null
      ? safePosts
      : safePosts.filter((p) => p._normCategory === selectedCategory);

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header>
        <h1 className="text-lg font-semibold text-white">Flokkar</h1>
        <p className="text-xs text-neutral-400">
          Veldu flokk til að sjá útsölutilboð í þeim flokki.
        </p>
      </header>

      {isLoading && (
        <p className="text-sm text-neutral-400">Sæki tilboð og flokka…</p>
      )}

      {error && !isLoading && (
        <p className="text-sm text-red-400">
          Tókst ekki að sækja tilboð til að byggja flokka.
        </p>
      )}

      {!isLoading && !error && (
        <>
          {/* FLOKKASLEÐI */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Flokkar</h2>

            {categories.length === 0 && (
              <p className="text-xs text-neutral-500">
                Engir flokkar fundust ennþá.
              </p>
            )}

            {categories.length > 0 && (
              <div className="-mx-3 px-3 overflow-x-auto">
                <div className="flex gap-2 flex-nowrap whitespace-nowrap py-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={
                      selectedCategory === null
                        ? "bg-white text-black text-xs border border-white"
                        : "text-xs border border-white text-white hover:bg-white hover:text-black"
                    }
                    onClick={() => setSelectedCategory(null)}
                  >
                    Allt
                  </Button>

                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      size="sm"
                      variant="outline"
                      className={
                        selectedCategory === cat
                          ? "bg-white text-black text-xs border border-white"
                          : "text-xs border border-white text-white hover:bg-white hover:text-black"
                      }
                      onClick={() => setSelectedCategory(cat)}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* TILBOÐ */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">
                {selectedCategory
                  ? `Tilboð í flokki: ${selectedCategory}`
                  : "Öll tilboð"}
              </h2>
              <p className="text-[11px] text-neutral-400">
                {visiblePosts.length} tilboð
              </p>
            </div>

            {visiblePosts.length === 0 && (
              <Card className="p-4 bg-white text-black border border-neutral-200 rounded-2xl">
                <p className="text-xs text-neutral-700">
                  Engin tilboð fundust í þessum flokki.
                </p>
              </Card>
            )}

            {visiblePosts.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {visiblePosts.map((post) => (
                  <Link key={post.id} to={`/post/${post.id}`}>
                    <SalePostCard post={post} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
