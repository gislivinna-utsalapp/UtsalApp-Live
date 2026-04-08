import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Phone, Globe } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";

type StoreItem = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  billingStatus?: string;
};

function StoreCard({ store }: { store: StoreItem }) {
  const initials = (store.name || "")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <Link to={`/store/${store.id}`} data-testid={`card-store-${store.id}`}>
      <Card className="p-4 flex items-start gap-3 hover-elevate active-elevate-2">
        <div className="flex-shrink-0 w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden">
          {store.logoUrl ? (
            <img
              src={store.logoUrl}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-primary text-sm font-bold">{initials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold truncate">{store.name}</p>

          {store.address && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{store.address}</span>
            </div>
          )}

          {store.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{store.phone}</span>
            </div>
          )}

          {store.website && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {store.website.replace(/^https?:\/\//, "")}
              </span>
            </div>
          )}
        </div>

        <Store className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
      </Card>
    </Link>
  );
}

export default function StoresPage() {
  const { data: stores = [], isLoading } = useQuery<StoreItem[]>({
    queryKey: ["stores-list"],
    queryFn: () => apiFetch<StoreItem[]>("/api/v1/stores"),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">Verslanir</h1>
        <p className="text-xs text-muted-foreground">
          Allar verslanir sem bjóða upp á útsölu í gegnum ÚtsalApp
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4 h-20 animate-pulse bg-muted" />
          ))}
        </div>
      )}

      {!isLoading && stores.length === 0 && (
        <Card className="p-8 text-center">
          <Store className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Engar verslanir eru skráðar enn
          </p>
        </Card>
      )}

      {!isLoading && stores.length > 0 && (
        <div className="space-y-2">
          {stores
            .filter((s) => s.name)
            .map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
        </div>
      )}
    </div>
  );
}
