import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Phone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SalePostCard } from "@/components/SalePostCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Store as StoreType, SalePostWithDetails } from "@shared/schema";
import { is } from "@/i18n/is";

/* === ACCESS LOGIC (frontend UX only) === */
function hasActiveAccess(accessEndsAt?: string | null): boolean {
  if (!accessEndsAt) return false;
  return new Date(accessEndsAt) > new Date();
}

export default function Store() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: store, isLoading: storeLoading } = useQuery<StoreType>({
    queryKey: [`/api/v1/stores/${id}`],
    enabled: !!id,
  });

  const { data: posts, isLoading: postsLoading } = useQuery<
    SalePostWithDetails[]
  >({
    queryKey: [`/api/v1/stores/${id}/posts`],
    enabled: !!id,
  });

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Skeleton className="h-48 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Verslun fannst ekki</p>
          <Button onClick={() => setLocation("/")}>{is.errors.goHome}</Button>
        </div>
      </div>
    );
  }

  const hasAccess = hasActiveAccess(store.accessEndsAt);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2 p-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft size={24} />
          </Button>
          <h1 className="text-lg font-semibold truncate">{store.name}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 border-4 border-card-border">
            <AvatarImage src={store.logoUrl || undefined} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {store.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2
              className="text-2xl font-bold mb-1"
              data-testid="text-store-name"
            >
              {store.name}
            </h2>
            {store.description && (
              <p
                className="text-muted-foreground"
                data-testid="text-description"
              >
                {store.description}
              </p>
            )}
          </div>
        </div>

        {(store.address || store.phone || store.website) && (
          <Card className="p-4 space-y-3">
            {store.address && (
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{is.store.address}</p>
                  <p className="text-sm text-muted-foreground">
                    {store.address}
                  </p>
                </div>
              </div>
            )}

            {store.phone && (
              <div className="flex items-start gap-3">
                <Phone size={20} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{is.store.phone}</p>
                  <a
                    href={`tel:${store.phone}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {store.phone}
                  </a>
                </div>
              </div>
            )}

            {store.website && (
              <div className="flex items-start gap-3">
                <Globe size={20} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{is.store.website}</p>
                  <a
                    href={store.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    {store.website}
                  </a>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* === ACCESS NOTICE === */}
        {!hasAccess && (
          <Card className="p-6 text-center border-destructive/40 bg-destructive/5">
            <p className="font-medium mb-2">
              Aðgangur verslunar er tímabundið lokaður
            </p>
            <p className="text-sm text-muted-foreground">
              Hafðu samband við ÚtsalApp til að virkja aðgang aftur.
            </p>
          </Card>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4">{is.store.activeSales}</h3>

          {!hasAccess ? null : postsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          ) : !posts || posts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground" data-testid="text-no-posts">
                {is.store.noSales}
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post) => (
                <SalePostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
