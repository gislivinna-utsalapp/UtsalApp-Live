import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 40;

interface PaginatedResponse {
  posts: SalePostWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}

export default function Home() {
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<PaginatedResponse>({
    queryKey: ["posts", "home", page],
    queryFn: () =>
      apiFetch<PaginatedResponse>(`/api/v1/posts?page=${page}&limit=${PAGE_SIZE}`),
  });

  const posts = data?.posts ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

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

  /* Split posts into two columns for staggered masonry feel */
  const leftCol: SalePostWithDetails[] = [];
  const rightCol: SalePostWithDetails[] = [];
  posts.forEach((p, i) => (i % 2 === 0 ? leftCol : rightCol).push(p));

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* ── App header ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
        <span className="text-lg font-extrabold tracking-tight text-neutral-900">
          Útsalapp
        </span>
        <span className="text-xs text-neutral-400 font-medium">
          {total > 0 ? `${total} tilboð` : ""}
        </span>
      </header>

      {/* ── Loading skeleton ───────────────────────────────────── */}
      {isLoading && (
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

      {error && (
        <div className="p-8 text-center text-sm text-neutral-500">
          Villa við að hlaða tilboðum.
        </div>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <div className="p-8 text-center text-sm text-neutral-500">
          Engin tilboð skráð ennþá.
        </div>
      )}

      {/* ── Staggered 2-column grid ────────────────────────────── */}
      {!isLoading && !error && posts.length > 0 && (
        <>
          <div className="flex gap-px bg-neutral-100">
            {/* Left column */}
            <div className="flex-1 flex flex-col gap-px">
              {leftCol.map((post) => (
                <SalePostCard key={post.id} post={post} />
              ))}
            </div>
            {/* Right column — offset by half a card for masonry feel */}
            <div className="flex-1 flex flex-col gap-px" style={{ marginTop: "12px" }}>
              {rightCol.map((post) => (
                <SalePostCard key={post.id} post={post} />
              ))}
            </div>
          </div>

          {/* ── Pagination ─────────────────────────────────────── */}
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
    </div>
  );
}
