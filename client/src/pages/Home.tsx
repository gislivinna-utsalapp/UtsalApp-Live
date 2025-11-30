// client/src/pages/Home.tsx
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { SalePostCard } from "@/components/SalePostCard";
import { Card } from "@/components/ui/card";

async function fetchPosts(): Promise<SalePostWithDetails[]> {
  return apiFetch<SalePostWithDetails[]>("/api/v1/posts");
}

export default function Home() {
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts", "home"],
    queryFn: fetchPosts,
  });

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 pt-6 space-y-6">
      {/* Hero-toppur */}
      <header className="space-y-4">
        {/* Logo + texti */}
        <div className="flex items-center gap-3">
          {/* % hringurinn með glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full bg-[#FF7A1A] blur-xl opacity-60"
              aria-hidden="true"
            />
            <div className="relative h-12 w-12 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#FF3D00] flex items-center justify-center shadow-lg border border-orange-300/40">
              <span className="text-2xl font-bold text-black">%</span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-white">ÚtsalApp</h1>
            <p className="text-sm text-neutral-400">
              Allar útsölur og bestu tilboðin nálægt þér.
            </p>
          </div>
        </div>
      </header>

      {isLoading && (
        <p className="text-sm text-neutral-400">Sæki útsölutilboð…</p>
      )}

      {error && !isLoading && (
        <p className="text-sm text-red-400">
          Tókst ekki að sækja útsölutilboðin.
        </p>
      )}

      {!isLoading && !error && posts.length === 0 && (
        <Card className="p-4 bg-white text-black border border-neutral-200 rounded-2xl">
          <p className="text-xs text-neutral-700">
            Engin tilboð eru skráð ennþá. Bættu við tilboði úr prófíl verslunar.
          </p>
        </Card>
      )}

      {!isLoading && !error && posts.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {posts.map((post) => (
            <Link key={post.id} to={`/post/${post.id}`}>
              <SalePostCard post={post} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
