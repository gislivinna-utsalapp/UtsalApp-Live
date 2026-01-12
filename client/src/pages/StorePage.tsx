import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { SalePostCard } from "@/components/SalePostCard";

export default function StorePage() {
  const { id } = useParams<{ id: string }>();

  // Sækjum verslun
  const {
    data: store,
    isLoading: storeLoading,
    error: storeError,
  } = useQuery({
    queryKey: ["store", id],
    queryFn: () => apiFetch(`/stores/${id}`),
    enabled: !!id,
  });

  // Sækjum öll tilboð verslunar
  const {
    data: posts,
    isLoading: postsLoading,
    error: postsError,
  } = useQuery({
    queryKey: ["store-posts", id],
    queryFn: () => apiFetch(`/stores/${id}/posts`),
    enabled: !!id,
  });

  if (storeLoading || postsLoading) {
    return <p className="text-center py-10">Hleður verslun…</p>;
  }

  if (storeError || !store) {
    return (
      <p className="text-center py-10 text-red-500">Verslun fannst ekki</p>
    );
  }

  return (
    <main className="space-y-6">
      {/* HEADER */}
      <Card className="p-4 space-y-2">
        <h1 className="text-xl font-bold">{store.name}</h1>

        {store.address && (
          <p className="text-sm text-muted-foreground">{store.address}</p>
        )}

        {store.website && (
          <a
            href={store.website}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary underline"
          >
            {store.website}
          </a>
        )}
      </Card>

      {/* POSTS */}
      <section className="space-y-3">
        {Array.isArray(posts) && posts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Engin virk tilboð í augnablikinu
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          {Array.isArray(posts) &&
            posts.map((post: any) => (
              <SalePostCard key={post.id} post={post} />
            ))}
        </div>
      </section>

      {/* BACK */}
      <div className="pt-4">
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← Til baka
        </Link>
      </div>
    </main>
  );
}
