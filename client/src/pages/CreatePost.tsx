// client/src/pages/CreatePost.tsx
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  images: {
    url: string;
    alt?: string;
  }[];
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// ====================
// Upload helper
// ====================
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
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

// ====================
// Component
// ====================
export default function CreatePost() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceOriginal, setPriceOriginal] = useState("");
  const [priceSale, setPriceSale] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImageUrl(null);
      return;
    }

    setErrorMsg(null);
    setImageFile(file);

    try {
      const uploadedUrl = await uploadImage(file);
      setImageUrl(uploadedUrl);
    } catch (err: any) {
      setImageFile(null);
      setImageUrl(null);
      setErrorMsg(
        err instanceof Error ? err.message : "Tókst ekki að hlaða upp mynd.",
      );
    }
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

    if (!imageUrl) {
      setErrorMsg("Mynd er ekki tilbúin.");
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
        images: [{ url: imageUrl, alt: title.trim() }],
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
          <Label>Titill</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />

          <Label>Lýsing</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-md p-2 text-sm"
          />

          <Label>Flokkur</Label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border rounded-md p-2 text-sm"
          >
            <option value="">Veldu flokk</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Verð áður"
              value={priceOriginal}
              onChange={(e) => setPriceOriginal(e.target.value)}
            />
            <Input
              placeholder="Tilboðsverð"
              value={priceSale}
              onChange={(e) => setPriceSale(e.target.value)}
            />
          </div>

          <Input
            placeholder="Kauplinkur"
            value={buyUrl}
            onChange={(e) => setBuyUrl(e.target.value)}
          />

          {/* ✅ TIMABUNDIN TILBOD */}
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
            <Input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>

          <Input type="file" accept="image/*" onChange={handleImageChange} />

          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              className="max-h-64 object-contain"
            />
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Bý til..." : "Búa til tilboð"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
