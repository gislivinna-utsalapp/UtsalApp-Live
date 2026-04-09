import { FormEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";

import { apiFetch } from "@/lib/api";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_IMAGES = 4;

const CATEGORY_OPTIONS = [
  "Fatnaður - Konur",
  "Fatnaður - Karlar",
  "Fatnaður - Börn",
  "Skór",
  "Íþróttavörur",
  "Heimili & húsgögn",
  "Raftæki",
  "Snyrtivörur",
  "Leikföng & börn",
  "Matur & veitingar",
  "Happy Hour",
  "2 fyrir 1",
  "Tilboð",
  "Verkfæri",
  "Bíllinn",
  "Heilsa og útlit",
  "Hljóðfæri",
  "Gjafaleikur",
  "Fermingargjafir",
  "Fermingartilboð",
  "Opnunartilboð",
  "Upplifun",
  "Annað",
  "Viðburðir",
];

type CreatePostPayload = {
  title: string;
  description: string;
  category: string;
  priceOriginal: number;
  priceSale: number;
  buyUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  images: { url: string; alt?: string }[];
};

type ImageSlot = {
  localPreview: string;
  uploadedUrl: string | null;
  uploading: boolean;
  error: string | null;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function uploadImage(file: File): Promise<string> {
  const token =
    localStorage.getItem("utsalapp_token") || localStorage.getItem("token");

  if (!token) {
    throw new Error("Enginn token fannst. Skráðu þig út og inn aftur.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const url = API_BASE_URL
    ? `${API_BASE_URL}/api/v1/uploads/image`
    : "/api/v1/uploads/image";

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error("Tókst ekki að hlaða upp mynd.");
  }

  const data = (await res.json()) as { imageUrl?: string };
  if (!data?.imageUrl) {
    throw new Error("Server skilaði ekki myndaslóð.");
  }

  return data.imageUrl;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceOriginal, setPriceOriginal] = useState("");
  const [priceSale, setPriceSale] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [images, setImages] = useState<ImageSlot[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleAddClick() {
    if (images.length >= MAX_IMAGES) return;
    fileInputRef.current?.click();
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    const toAdd = Array.from(files).slice(0, remaining);

    for (const file of toAdd) {
      const localPreview = URL.createObjectURL(file);
      const slot: ImageSlot = {
        localPreview,
        uploadedUrl: null,
        uploading: true,
        error: null,
      };

      setImages((prev) => [...prev, slot]);
      const idx = images.length + toAdd.indexOf(file);

      try {
        const uploadedUrl = await uploadImage(file);
        setImages((prev) =>
          prev.map((s, i) =>
            i === idx ? { ...s, uploadedUrl, uploading: false } : s,
          ),
        );
      } catch (err) {
        setImages((prev) =>
          prev.map((s, i) =>
            i === idx
              ? {
                  ...s,
                  uploading: false,
                  error:
                    err instanceof Error
                      ? err.message
                      : "Upphleðsla mistókst",
                }
              : s,
          ),
        );
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleRemoveImage(idx: number) {
    setImages((prev) => {
      const removed = prev[idx];
      if (removed?.localPreview) URL.revokeObjectURL(removed.localPreview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!title.trim()) {
      setErrorMsg("Titill vantar.");
      return;
    }

    if (!category.trim()) {
      setErrorMsg("Veldu flokk.");
      return;
    }

    const original = Number(priceOriginal.replace(",", "."));
    const sale = Number(priceSale.replace(",", "."));

    if (!Number.isFinite(original) || !Number.isFinite(sale)) {
      setErrorMsg("Verð þarf að vera tölur.");
      return;
    }

    const uploadedImages = images.filter((s) => s.uploadedUrl && !s.error);
    if (uploadedImages.length === 0) {
      setErrorMsg("Bættu við að minnsta kosti einni mynd.");
      return;
    }

    const stillUploading = images.some((s) => s.uploading);
    if (stillUploading) {
      setErrorMsg("Myndir eru enn að hlaðast upp. Bíddu augnablik.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: CreatePostPayload = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        priceOriginal: original,
        priceSale: sale,
        buyUrl: buyUrl.trim() || null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        images: uploadedImages.map((s) => ({
          url: s.uploadedUrl!,
          alt: title.trim(),
        })),
      };

      await apiFetch("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["my-posts"] });

      setSuccessMsg("Tilboð var búið til.");
      setTimeout(() => navigate("/profile"), 800);
    } catch (err: any) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Villa kom upp við að búa til tilboð.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
      <h1 className="text-lg font-semibold mb-3">Búa til nýtt tilboð</h1>

      <Card className="p-4 space-y-4">
        {errorMsg && <div className="text-xs text-red-600">{errorMsg}</div>}
        {successMsg && (
          <div className="text-xs text-green-600">{successMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titill</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-post-title"
            />
          </div>

          <div>
            <Label>Lýsing</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md p-2 text-sm"
              data-testid="input-post-description"
            />
          </div>

          <div>
            <Label>Flokkur</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-md p-2 text-sm"
              data-testid="select-post-category"
            >
              <option value="">Veldu flokk</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Verð áður</Label>
              <Input
                placeholder="t.d. 9990"
                value={priceOriginal}
                onChange={(e) => setPriceOriginal(e.target.value)}
                data-testid="input-price-original"
              />
            </div>
            <div>
              <Label>Tilboðsverð</Label>
              <Input
                placeholder="t.d. 4990"
                value={priceSale}
                onChange={(e) => setPriceSale(e.target.value)}
                data-testid="input-price-sale"
              />
            </div>
          </div>

          <div>
            <Label>Kauplinkur (valfrjálst)</Label>
            <Input
              placeholder="https://..."
              value={buyUrl}
              onChange={(e) => setBuyUrl(e.target.value)}
              data-testid="input-buy-url"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Byrjar</Label>
              <Input
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                data-testid="input-starts-at"
              />
            </div>
            <div>
              <Label>Endar</Label>
              <Input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                data-testid="input-ends-at"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">
              Myndir ({images.length}/{MAX_IMAGES})
            </Label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFilesSelected}
              data-testid="input-images-hidden"
            />

            <div className="grid grid-cols-4 gap-2">
              {images.map((slot, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square rounded-lg border border-border overflow-hidden bg-muted"
                  data-testid={`img-slot-${idx}`}
                >
                  <img
                    src={slot.localPreview}
                    alt={`Mynd ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {slot.uploading && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {slot.error && (
                    <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                      <p className="text-[9px] text-white text-center px-1">
                        {slot.error}
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                    data-testid={`button-remove-image-${idx}`}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}

              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                  data-testid="button-add-image"
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">
                    Bæta við
                  </span>
                </button>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
            data-testid="button-submit-post"
          >
            {isSubmitting ? "Bý til..." : "Búa til tilboð"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
