// client/src/pages/StorePage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Phone, Globe, ChevronLeft, Store, Tag } from "lucide-react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { SalePostCard } from "@/components/SalePostCard";

type StoreDetail = {
  id: string;
  name: string;
  category?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  coverPositionY?: number;
  billingStatus?: string;
  plan?: string | null;
  createdAt?: string | null;
};

function buildUrl(raw?: string | null): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base = (API_BASE_URL || "").replace(/\/$/, "");
  return base ? `${base}${raw.startsWith("/") ? raw : `/${raw}`}` : raw;
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StorePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: store, isLoading: storeLoading, error: storeError } =
    useQuery<StoreDetail>({
      queryKey: ["store", id],
      queryFn: () => apiFetch<StoreDetail>(`/api/v1/stores/${id}`),
      enabled: !!id,
    });

  const { data: postsRaw = [], isLoading: postsLoading } = useQuery({
    queryKey: ["store-posts", id],
    queryFn: () => apiFetch(`/api/v1/stores/${id}/posts`),
    enabled: !!id,
  });

  const posts = Array.isArray(postsRaw) ? postsRaw : [];
  const logoSrc = buildUrl(store?.logoUrl);
  const coverSrc = buildUrl(store?.coverUrl);
  const coverPosY = store?.coverPositionY ?? 50;

  /* ── Loading skeleton ─────────────────────────────────────── */
  if (storeLoading || postsLoading) {
    return (
      <div className="bg-white min-h-screen pb-20 animate-pulse">
        <div className="h-32 bg-neutral-200" />
        <div className="px-4 -mt-10 flex items-end gap-3">
          <div className="w-20 h-20 rounded-full bg-neutral-300 border-4 border-white" />
          <div className="pb-1 space-y-1.5 flex-1">
            <div className="h-4 bg-neutral-200 rounded w-1/2" />
            <div className="h-3 bg-neutral-100 rounded w-1/3" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-px bg-neutral-100 mt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white">
              <div className="w-full bg-neutral-100" style={{ aspectRatio: "3/4" }} />
              <div className="p-2 space-y-1">
                <div className="h-2 bg-neutral-100 rounded w-3/4" />
                <div className="h-2 bg-neutral-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ────────────────────────────────────────────────── */
  if (storeError || !store) {
    return (
      <div className="bg-white min-h-screen flex flex-col items-center justify-center gap-4 pb-20">
        <Store className="w-12 h-12 text-neutral-200" />
        <p className="text-sm text-neutral-500">Verslun fannst ekki</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-neutral-700 underline"
        >
          Til baka
        </button>
      </div>
    );
  }

  /* ── Main ─────────────────────────────────────────────────── */
  return (
    <div className="bg-white min-h-screen pb-24">

      {/* ── Hero banner ────────────────────────────────────────── */}
      <div className="relative h-36 bg-neutral-900 overflow-hidden">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: `50% ${coverPosY}%` }}
          />
        ) : (
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "12px 12px" }}
          />
        )}
        <div className="absolute inset-0 bg-black/25" />
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 z-10 w-8 h-8 bg-black/30 rounded-full flex items-center justify-center"
          data-testid="button-back-store"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ── Store identity ─────────────────────────────────────── */}
      <div className="px-4">
        {/* Logo + name row */}
        <div className="flex items-end gap-3 -mt-10 mb-3">
          {/* Logo */}
          <div className="flex-shrink-0 w-20 h-20 rounded-full border-4 border-white bg-neutral-100 overflow-hidden shadow-sm">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={store.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                <span className="text-white text-xl font-bold tracking-tight">
                  {initials(store.name)}
                </span>
              </div>
            )}
          </div>

          {/* Name + badge */}
          <div className="pb-1 flex-1 min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 leading-tight truncate">
              {store.name}
            </h1>
            {store.category && (
              <span className="inline-block text-[10px] font-medium text-neutral-500 uppercase tracking-wide mt-0.5">
                {store.category}
              </span>
            )}
          </div>
        </div>

        {/* Contact info */}
        {(store.address || store.phone || store.website) && (
          <div className="space-y-1.5 pb-4 border-b border-neutral-100">
            {store.address && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{store.address}</span>
              </div>
            )}
            {store.phone && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                <a
                  href={`tel:${store.phone}`}
                  className="hover:text-neutral-800 transition-colors"
                  data-testid="link-store-phone"
                >
                  {store.phone}
                </a>
              </div>
            )}
            {store.website && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <a
                  href={store.website.startsWith("http") ? store.website : `https://${store.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-neutral-800 transition-colors truncate"
                  data-testid="link-store-website"
                >
                  {store.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Offers section ─────────────────────────────────────── */}
      <div className="mt-4">
        {/* Section header */}
        <div className="px-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-800">Tilboð</h2>
          </div>
          {posts.length > 0 && (
            <span className="text-xs text-neutral-400">{posts.length} tilboð</span>
          )}
        </div>

        {/* Empty state */}
        {posts.length === 0 && (
          <div className="px-4 py-16 text-center">
            <Tag className="w-10 h-10 text-neutral-200 mx-auto mb-3" />
            <p className="text-sm text-neutral-400">Engin virk tilboð í augnablikinu</p>
          </div>
        )}

        {/* Grid */}
        {posts.length > 0 && (
          <div className="grid grid-cols-2 gap-px bg-neutral-100">
            {posts.map((post: any) => (
              <SalePostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
