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

// Undirflokkar – nota sömu gildi og í CreatePost.tsx / gagnagrunni
type Subcategory = {
  value: string;
  label: string;
};

type MegaCategory = {
  id: string;
  name: string;
  subcategories: Subcategory[];
};

// Hjálparfall til að normalisera flokka
function normalizeCategory(value?: string | null): string | null {
  if (!value) return null;
  return value.trim().toLowerCase();
}

// Nýtt: sækja alla flokka sem tilboð er í (category + categories[])
function getPostCategories(post: SalePostWithDetails): string[] {
  const set = new Set<string>();

  if (post.category) {
    const n = normalizeCategory(post.category);
    if (n) set.add(n);
  }

  if (Array.isArray((post as any).categories)) {
    for (const c of (post as any).categories as string[]) {
      const n = normalizeCategory(c);
      if (n) set.add(n);
    }
  }

  return Array.from(set);
}

// Viðburðaflokkar (núna byggt á „Happy Hour“ – hægt að stækka síðar)
const EVENT_CATEGORY_VALUES = ["Happy Hour"];

// MEGA-flokkar: Allt + Viðburðir + 5 „venjulegir“
const MEGA_CATEGORIES: MegaCategory[] = [
  {
    id: "all",
    name: "Allt",
    subcategories: [],
  },
  {
    id: "events",
    name: "Viðburðir (t.d. Happy Hour)",
    subcategories: [],
  },
  {
    id: "food",
    name: "Veitingar & Matur",
    subcategories: [
      { value: "Matur & veitingar", label: "Matur & veitingar" },
      { value: "Happy Hour", label: "Happy Hour" },
    ],
  },
  {
    id: "fashion",
    name: "Fatnaður & Lífstíll",
    subcategories: [
      { value: "Fatnaður - Konur", label: "Fatnaður - Konur" },
      { value: "Fatnaður - Karlar", label: "Fatnaður - Karlar" },
      { value: "Fatnaður - Börn", label: "Fatnaður - Börn" },
      { value: "Skór", label: "Skór" },
      { value: "Íþróttavörur", label: "Íþróttavörur" },
      { value: "Leikföng & börn", label: "Leikföng & börn" },
    ],
  },
  {
    id: "home",
    name: "Heimili & Húsgögn",
    subcategories: [{ value: "Heimili & húsgögn", label: "Heimili & húsgögn" }],
  },
  {
    id: "tech",
    name: "Tækni & Rafmagn",
    subcategories: [{ value: "Raftæki", label: "Raftæki" }],
  },
  {
    id: "beauty-other",
    name: "Beauty, Heilsu & Annað",
    subcategories: [
      { value: "Snyrtivörur", label: "Snyrtivörur" },
      { value: "Annað", label: "Annað" },
    ],
  },
];

export default function CategoriesPage() {
  // Sjálfgefið: „Allt“
  const [selectedMegaId, setSelectedMegaId] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "categories"],
    queryFn: fetchPosts,
  });

  const activeMega = useMemo(() => {
    return MEGA_CATEGORIES.find((m) => m.id === selectedMegaId) ?? null;
  }, [selectedMegaId]);

  const filteredPosts = useMemo(() => {
    let result = posts;

    // 1. Sía eftir megaflokki
    if (selectedMegaId === "events") {
      // „Viðburðir“: nota EVENT_CATEGORY_VALUES
      const eventSet = new Set(
        EVENT_CATEGORY_VALUES.map((v) => normalizeCategory(v)).filter(
          (v): v is string => v !== null,
        ),
      );

      result = result.filter((post) => {
        const cats = getPostCategories(post);
        return cats.some((c) => eventSet.has(c));
      });
    } else if (selectedMegaId !== "all" && activeMega) {
      // Aðrir mega-flokkar en „Allt“
      const allowed = new Set(
        activeMega.subcategories
          .map((s) => normalizeCategory(s.value))
          .filter((v): v is string => v !== null),
      );

      result = result.filter((post) => {
        const cats = getPostCategories(post);
        return cats.some((c) => allowed.has(c));
      });
    }

    // 2. Sía eftir undirflokki (ef valinn)
    if (selectedCategory) {
      const target = normalizeCategory(selectedCategory);
      result = result.filter((post) => {
        const cats = getPostCategories(post);
        return !!target && cats.includes(target);
      });
    }

    return result;
  }, [posts, selectedMegaId, activeMega, selectedCategory]);

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-white">Flokkar</h1>
        <p className="text-sm text-gray-300">
          Veldu megaflokk og undirflokk til að skoða tilboðin.
        </p>
      </header>

      {/* FLokkakerfi: 1) MEGA 2) UNDIR */}
      <section className="space-y-4">
        {/* MEGA-flokkar */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-gray-400">
            Megaflokkar
          </p>
          <div className="flex flex-wrap gap-2">
            {MEGA_CATEGORIES.map((mega) => (
              <Button
                key={mega.id}
                variant={selectedMegaId === mega.id ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
                onClick={() => {
                  setSelectedMegaId(mega.id);
                  setSelectedCategory(null);
                }}
              >
                {mega.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Undirflokkar – bara þegar mega er EKKI „Allt“ eða „Viðburðir“ */}
        {activeMega &&
          activeMega.id !== "all" &&
          activeMega.id !== "events" &&
          activeMega.subcategories.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                Undirflokkar
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  Allt í þessum flokki
                </Button>

                {activeMega.subcategories.map((sub) => (
                  <Button
                    key={sub.value}
                    variant={
                      selectedCategory === sub.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedCategory(sub.value)}
                  >
                    {sub.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
      </section>

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
          <p>Engin tilboð passa þessa flokka eins og er.</p>
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
