import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { PromoBanner } from "@/components/PromoBanner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 40;
const BANNER_INTERVAL = 8;

interface PaginatedResponse {
  posts: SalePostWithDetails[];
  total: number;
  page: number;
  totalPages: number;
}

export default function Home() {
  const [page, setPage] = useState(1);

  const {
    data,
    isLoading,
    error,
  } = useQuery<PaginatedResponse>({
    queryKey: ["posts", "home", page],
    queryFn: () => apiFetch<PaginatedResponse>(`/api/v1/posts?page=${page}&limit=${PAGE_SIZE}`),
  });

  const posts = data?.posts ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  const feedItems: Array<
    | { type: "post"; post: SalePostWithDetails }
    | { type: "banner"; key: string; variant: "fermingar" | "subscription" }
  > = [];

  let bannerCount = 0;
  posts.forEach((post, index) => {
    feedItems.push({ type: "post", post });
    if ((index + 1) % BANNER_INTERVAL === 0 && index + 1 < posts.length) {
      const variant = bannerCount % 2 === 0 ? "fermingar" : "subscription";
      feedItems.push({ type: "banner", key: `banner-${index}`, variant });
      bannerCount++;
    }
  });

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pageNumbers: number[] = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1);
  }
  for (let i = start; i <= end; i++) {
    pageNumbers.push(i);
  }

  return (
    <main className="max-w-4xl mx-auto px-3 pb-24 pt-4 space-y-4">
      <header className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center shadow-lg">
          <span className="text-3xl font-extrabold text-white">%</span>
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">ÚtsalApp</h1>
          <p className="text-sm text-gray-200">
            Allar útsölur og bestu tilboðin nálægt þér.
          </p>
        </div>
      </header>

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

      {!isLoading && !error && posts.length === 0 && (
        <Card className="p-4">
          <p>Engin tilboð skráð ennþá.</p>
        </Card>
      )}

      {!isLoading && !error && feedItems.length > 0 && (
        <section>
          <div className="grid grid-cols-2 gap-3">
            {feedItems.map((item) =>
              item.type === "banner" ? (
                <PromoBanner key={item.key} variant={item.variant} />
              ) : (
                <SalePostCard key={item.post.id} post={item.post} />
              )
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6 flex-wrap" data-testid="pagination-controls">
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
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goToPage(1)}
                    data-testid="button-page-1"
                  >
                    1
                  </Button>
                  {start > 2 && (
                    <span className="text-xs text-muted-foreground px-1">...</span>
                  )}
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
                  {end < totalPages - 1 && (
                    <span className="text-xs text-muted-foreground px-1">...</span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => goToPage(totalPages)}
                    data-testid={`button-page-${totalPages}`}
                  >
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

              <span className="text-xs text-muted-foreground ml-2">
                Síða {page} af {totalPages} ({total} tilboð)
              </span>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
