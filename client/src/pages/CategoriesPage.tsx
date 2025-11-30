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

// Normalizer til að mappa gömul og vitlaus heiti yfir í ný, rétt heiti
function normalizeCategory(raw: string | null | undefined): string {
  const c = (raw || "").trim();
  if (!c) return "";

  const lower = c.toLowerCase();

  // Allt sem byrjar á "rafmagn" => Raftæki
  if (lower.startsWith("rafmagn")) {
    return "Raftæki";
  }

  // "veitingar" => Matur & veitingar
  if (lower === "veitingar") {
    return "Matur & veitingar";
  }

  // Möguleg afbrigði af mat/veitingum sem gætu hafa slæðst inn
  if (lower === "matur og veitingar") {
    return "Matur & veitingar";
  }

  // Vitlaust skrifaðar snyrtivörur => Snyrtivörur
  if (lower === "snyrtivorur") {
    return "Snyrtivörur";
  }

  // Vitlaust skrifað "annad" => Annað
  if (lower === "annad") {
    return "Annað";
  }

  // "heimili" => Heimili & húsgögn
  if (lower === "heimili") {
    return "Heimili & húsgögn";
  }

  // Ef þetta er eitt af okkar kanónísku heitum, skilum því beint
  if (BASE_CATEGORIES.includes(c)) {
    return c;
  }

  // Default: tryggjum að strengurinn byrji á stórum staf
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export default function CategoriesPage() {
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "categories"],
    queryFn: fetchPosts,
  });

  // Normaliserum flokka fyrir öll tilboð
  const normalizedPosts = posts.map((p) => ({
    ...p,
    _normCategory: normalizeCategory(p.category),
  }));

  // Flokkar byggðir bæði á grunnlista + raunverulegum gögnum
  const categories = Array.from(
    new Set([
      ...BASE_CATEGORIES,
      ...normalizedPosts
        .map((p) => p._normCategory)
        .filter((c) => c && c.length > 0),
    ]),
  ).sort();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const visiblePosts =
    selectedCategory === null
      ? normalizedPosts
      : normalizedPosts.filter((p) => p._normCategory === selectedCategory);

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">Flokkar</h1>
          <p className="text-xs text-neutral-400">
            Veldu flokk til að sjá útsölutilboð í þeim flokki.
          </p>
        </div>
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
          {/* Flokkar */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Flokkar</h2>

            {categories.length === 0 && (
              <p className="text-xs text-neutral-500">
                Engir flokkar fundust ennþá.
              </p>
            )}

            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={
                    selectedCategory === null
                      ? "bg-white text-black text-xs border border-white hover:bg-neutral-200"
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
                        ? "bg-white text-black text-xs border border-white hover:bg-neutral-200"
                        : "text-xs border border-white text-white hover:bg-white hover:text-black"
                    }
                    onClick={() =>
                      setSelectedCategory(selectedCategory === cat ? null : cat)
                    }
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            )}
          </section>

          {/* Tilboð í völdum flokki */}
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
