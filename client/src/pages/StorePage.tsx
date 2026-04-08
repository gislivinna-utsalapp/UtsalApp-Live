import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Globe, ArrowLeft, ShoppingBag } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { SalePostCard } from "@/components/SalePostCard";

type StoreDetail = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  billingStatus?: string;
};

export default function StorePage() {
  const { id } = useParams<{ id: string }>();

  const {
    data: store,
    isLoading: storeLoading,
    error: storeError,
  } = useQuery<StoreDetail>({
    queryKey: ["store", id],
    queryFn: () => apiFetch<StoreDetail>(`/api/v1/stores/${id}`),
    enabled: !!id,
  });

  const {
    data: posts = [],
    isLoading: postsLoading,
  } = useQuery({
    queryKey: ["store-posts", id],
    queryFn: () => apiFetch(`/api/v1/stores/${id}/posts`),
    enabled: !!id,
  });

  const safePosts = Array.isArray(posts) ? posts : [];

  const initials = store?.name
    ? store.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";

  if (storeLoading || postsLoading) {
    return (
      <div className="space-y-4">
        <Card className="p-5 h-32 animate-pulse bg-muted" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-48 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-sm text-muted-foreground">Verslun fannst ekki</p>
        <Link
          to="/stores"
          className="text-sm text-primary underline"
        >
          ← Til baka í verslanir
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/stores"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        data-testid="link-back-stores"
      >
        <ArrowLeft className="w-3 h-3" />
        Allar verslanir
      </Link>

      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
            {store.logoUrl ? (
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-primary text-lg font-bold">{initials}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight">{store.name}</h1>
            {store.billingStatus === "active" && (
              <span className="inline-block text-[10px] uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-1">
                Virkur
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          {store.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>{store.address}</span>
            </div>
          )}

          {store.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4 flex-shrink-0 text-primary" />
              <a href={`tel:${store.phone}`} className="hover:text-foreground transition-colors">
                {store.phone}
              </a>
            </div>
          )}

          {store.website && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="w-4 h-4 flex-shrink-0 text-primary" />
              <a
                href={store.website.startsWith("http") ? store.website : `https://${store.website}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors truncate"
              >
                {store.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold">
            Útsölur og tilboð
            {safePosts.length > 0 && (
              <span className="ml-2 text-muted-foreground font-normal">
                ({safePosts.length})
              </span>
            )}
          </h2>
        </div>

        {safePosts.length === 0 && (
          <Card className="p-8 text-center">
            <ShoppingBag className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Engin virk tilboð í augnablikinu
            </p>
          </Card>
        )}

        {safePosts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {safePosts.map((post: any) => (
              <SalePostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
