// client/src/pages/SearchPage.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";

async function searchPosts(term: string): Promise<SalePostWithDetails[]> {
  const q = term.trim();
  if (!q) return [];
  const res = await apiFetch<{ posts: SalePostWithDetails[] }>(
    `/api/v1/posts?q=${encodeURIComponent(q)}&limit=100`,
  );
  return res.posts ?? [];
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: results = [], isLoading, error } = useQuery({
    queryKey: ["posts", "search", searchTerm],
    enabled: searchTerm.trim().length > 0,
    queryFn: () => searchPosts(searchTerm),
  });

  const activeTerm = searchTerm.trim();

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* ── Sticky search bar ─────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-3 py-2.5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Leita að tilboðum…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full pl-9 pr-3 py-2 bg-neutral-100 text-sm text-neutral-900 placeholder-neutral-400 rounded-sm outline-none focus:bg-neutral-50 focus:ring-1 focus:ring-neutral-300 transition-colors"
            data-testid="input-search"
          />
        </div>
      </header>

      {/* ── States ────────────────────────────────────────────── */}
      {activeTerm.length === 0 && (
        <div className="px-4 pt-16 text-center">
          <Search className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
          <p className="text-sm text-neutral-400">Byrjaðu að skrifa til að leita</p>
        </div>
      )}

      {activeTerm.length > 0 && isLoading && (
        <div className="grid grid-cols-2 gap-px bg-neutral-100 p-px mt-px">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white">
              <div className="w-full bg-neutral-100 animate-pulse" style={{ aspectRatio: "3/4" }} />
              <div className="p-2 space-y-1">
                <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-3/4" />
                <div className="h-2.5 bg-neutral-100 rounded animate-pulse w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTerm.length > 0 && !isLoading && error && (
        <p className="px-4 pt-8 text-sm text-center text-neutral-500">
          Villa við leit. Reyndu aftur.
        </p>
      )}

      {activeTerm.length > 0 && !isLoading && !error && results.length === 0 && (
        <div className="px-4 pt-16 text-center">
          <p className="text-sm text-neutral-500">
            Engin tilboð fundust fyrir „{activeTerm}"
          </p>
        </div>
      )}

      {results.length > 0 && !isLoading && (
        <>
          <div className="px-3 py-2 text-xs text-neutral-400">
            {results.length} tilboð fundust
          </div>
          <div className="grid grid-cols-2 gap-px bg-neutral-100">
            {results.map((post) => (
              <SalePostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
