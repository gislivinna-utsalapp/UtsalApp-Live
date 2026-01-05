// client/src/pages/SearchPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

async function searchPosts(term: string): Promise<SalePostWithDetails[]> {
  const q = term.trim();
  if (!q) return [];
  return apiFetch<SalePostWithDetails[]>(
    `/api/v1/posts?q=${encodeURIComponent(q)}`,
  );
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: results = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "search", searchTerm],
    enabled: searchTerm.trim().length > 0,
    queryFn: () => searchPosts(searchTerm),
  });

  const activeTerm = searchTerm.trim();

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold text-white">Leit</h1>
        <p className="text-xs text-neutral-400">
          Niðurstöður uppfærast sjálfkrafa þegar þú skrifar.
        </p>

        <Input
          type="search"
          placeholder="Dæmi: kjóll, jakki, sófi…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-sm mt-2 bg-white text-black border border-neutral-300"
        />
      </header>

      {/* Stöður: ekkert leitarorð, er að leita, villa, niðurstaða */}
      {activeTerm.length === 0 && (
        <p className="text-xs text-neutral-400">
          Byrjaðu að skrifa til að sjá niðurstöður.
        </p>
      )}

      {activeTerm.length > 0 && isLoading && (
        <p className="text-sm text-neutral-400">Leita að „{activeTerm}“…</p>
      )}

      {activeTerm.length > 0 && error && !isLoading && (
        <p className="text-sm text-red-400">Tókst ekki að leita að tilboðum.</p>
      )}

      {activeTerm.length > 0 && !isLoading && !error && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">
              Niðurstöður fyrir: {activeTerm}
            </h2>
            <p className="text-[11px] text-neutral-400">
              {results.length} niðurstöður
            </p>
          </div>

          {results.length === 0 && (
            <Card className="p-4 bg-white text-black border border-neutral-200 rounded-2xl">
              <p className="text-xs text-neutral-700">
                Engin tilboð fundust fyrir „{activeTerm}“.
              </p>
            </Card>
          )}

          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {results.map((post) => (
                <Link key={post.id} to={`/post/${post.id}`}>
                  <SalePostCard post={post} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
