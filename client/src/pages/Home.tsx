import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Button } from "@/components/ui/button";
import { InstallBanner } from "@/components/InstallBanner";

const PAGE_SIZE = 40;

interface PaginatedResponse {
  posts: SalePostWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}

export default function Home() {
  const [page, setPage] = useState(1);
  const [searchQ, setSearchQ] = useState("");

  const activeQ = searchQ.trim();

  /* ── Feed query (normal mode) ─────────────────────────────── */
  const { data, isLoading: feedLoading, error: feedError } = useQuery<PaginatedResponse>({
    queryKey: ["posts", "home", page],
    queryFn: () =>
      apiFetch<PaginatedResponse>(`/api/v1/posts?page=${page}&limit=${PAGE_SIZE}`),
  });

  /* ── Live search query ────────────────────────────────────── */
  const { data: searchData, isFetching: searchFetching } = useQuery<{ posts: SalePostWithDetails[] }>({
    queryKey: ["posts", "search", activeQ],
    enabled: activeQ.length > 0,
    queryFn: () =>
      apiFetch<{ posts: SalePostWithDetails[] }>(
        `/api/v1/posts?q=${encodeURIComponent(activeQ)}&limit=100`,
      ),
  });

  const posts = data?.posts ?? [];
  const totalPages = data?.totalPages ?? 1;

  const searchResults = searchData?.posts ?? [];

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  const leftCol: SalePostWithDetails[] = [];
  const rightCol: SalePostWithDetails[] = [];
  posts.forEach((p, i) => (i % 2 === 0 ? leftCol : rightCol).push(p));

  const searchLeftCol: SalePostWithDetails[] = [];
  const searchRightCol: SalePostWithDetails[] = [];
  searchResults.forEach((p, i) => (i % 2 === 0 ? searchLeftCol : searchRightCol).push(p));

  const isSearchMode = activeQ.length > 0;

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-2 flex items-center gap-3">
        <span className="text-base font-extrabold tracking-tight text-neutral-900 whitespace-nowrap flex-shrink-0">
          ÚtsalApp
        </span>

        <div className="flex-1 flex items-center bg-neutral-100 rounded-full px-3 gap-2">
          <Search className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Leita að tilboðum..."
            autoCapitalize="none"
            autoCorrect="off"
            data-testid="input-header-search"
            className="flex-1 bg-transparent py-2 text-sm text-neutral-800 placeholder:text-neutral-400 outline-none min-w-0"
          />
          {searchQ && (
            <button
              type="button"
              onClick={() => setSearchQ("")}
              className="flex-shrink-0 text-neutral-400 hover:text-neutral-600 transition-colors"
              data-testid="button-clear-search"
              aria-label="Hreinsa leit"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      <InstallBanner />

      {/* ── SEARCH MODE ────────────────────────────────────────── */}
      {isSearchMode && (
        <>
          {searchFetching && searchResults.length === 0 ? (
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
          ) : searchResults.length === 0 ? (
            <div className="pt-16 text-center px-4">
              <Search className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
              <p className="text-sm text-neutral-400">
                Engin tilboð fundust fyrir „{activeQ}"
              </p>
            </div>
          ) : (
            <>
              <div className="px-3 py-2 text-xs text-neutral-400">
                {searchResults.length} tilboð fundust
              </div>
              <div className="flex gap-px bg-neutral-100">
                <div className="flex-1 flex flex-col gap-px">
                  {searchLeftCol.map((post) => (
                    <SalePostCard key={post.id} post={post} />
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-px" style={{ marginTop: "12px" }}>
                  {searchRightCol.map((post) => (
                    <SalePostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── FEED MODE ──────────────────────────────────────────── */}
      {!isSearchMode && (
        <>
          {feedLoading && (
            <div className="grid grid-cols-2 gap-px bg-neutral-100 p-px">
              {Array.from({ length: 6 }).map((_, i) => (
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

          {feedError && (
            <div className="p-8 text-center text-sm text-neutral-500">
              Villa við að hlaða tilboðum.
            </div>
          )}

          {!feedLoading && !feedError && posts.length === 0 && (
            <div className="p-8 text-center text-sm text-neutral-500">
              Engin tilboð skráð ennþá.
            </div>
          )}

          {!feedLoading && !feedError && posts.length > 0 && (
            <>
              <div className="flex gap-px bg-neutral-100">
                <div className="flex-1 flex flex-col gap-px">
                  {leftCol.map((post) => (
                    <SalePostCard key={post.id} post={post} />
                  ))}
                </div>
                <div className="flex-1 flex flex-col gap-px" style={{ marginTop: "12px" }}>
                  {rightCol.map((post) => (
                    <SalePostCard key={post.id} post={post} />
                  ))}
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 py-6 flex-wrap">
                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={page <= 1}
                    onClick={() => goToPage(page - 1)}
                    data-testid="button-page-prev"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  {start > 1 && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => goToPage(1)}>1</Button>
                      {start > 2 && <span className="text-xs text-muted-foreground px-1">…</span>}
                    </>
                  )}

                  {pageNumbers.map((p) => (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === page ? "default" : "ghost"}
                      onClick={() => goToPage(p)}
                      data-testid={`button-page-${p}`}
                    >
                      {p}
                    </Button>
                  ))}

                  {end < totalPages && (
                    <>
                      {end < totalPages - 1 && <span className="text-xs text-muted-foreground px-1">…</span>}
                      <Button size="sm" variant="ghost" onClick={() => goToPage(totalPages)}>
                        {totalPages}
                      </Button>
                    </>
                  )}

                  <Button
                    size="icon"
                    variant="ghost"
                    disabled={page >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    data-testid="button-page-next"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
