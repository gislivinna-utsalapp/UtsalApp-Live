// client/src/pages/CreatePost.tsx
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Flokkar
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
  "Annað",
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
  images: string[]; // 🔴 LAGFÆRT: var { url }[]
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Upload image – EKKERT breytt nema að við skilum string
async function uploadImage(file: File): Promise<string> {
  const token =
    localStorage.getItem("utsalapp_token") || localStorage.getItem("token");

  if (!token) {
    throw new Error("Enginn token fannst. Skráðu þig út og inn aftur.");
  }

  const formData = new FormData();
  formData.append("image", file);

  const url = API_BASE_URL
    ? `${API_BASE_URL}/api/v1/uploads`
    : "/api/v1/uploads";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Upload response:", text);
    throw new Error("Tókst ekki að hlaða upp mynd.");
  }

  const data = (await res.json()) as { url?: string };
  if (!data?.url) {
    throw new Error("Server skilaði ekki myndaslóð.");
  }

  return data.url; // 🔴 strengur: /api/v1/uploads/xxx.jpg
}

export default function CreatePost() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [priceOriginal, setPriceOriginal] = useState("");
  const [priceSale, setPriceSale] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
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
      setErrorMsg("Veldu flokk fyrir tilboðið.");
      return;
    }

    const original = Number(priceOriginal.replace(",", "."));
    const sale = Number(priceSale.replace(",", "."));

    if (!Number.isFinite(original) || !Number.isFinite(sale)) {
      setErrorMsg("Verð þarf að vera tölur.");
      return;
    }

    if (!imageFile) {
      setErrorMsg("Veldu mynd fyrir tilboðið.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Upload mynd
      const imageUrl = await uploadImage(imageFile);

      // 2. Payload – EINA breytingin hér
      const payload: CreatePostPayload = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        priceOriginal: original,
        priceSale: sale,
        buyUrl: buyUrl.trim() || null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        images: [imageUrl], // 🔴 LAGFÆRT
      };

      await apiFetch("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setSuccessMsg("Tilboð var búið til.");
      setTimeout(() => navigate("/profile"), 800);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Tókst ekki að búa til auglýsingu.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
      <h1 className="text-lg font-semibold mb-3">Búa til nýtt tilboð</h1>

      <Card className="p-4 space-y-4">
        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="title">Titill tilboðs</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">Lýsing</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-black rounded-md px-3 py-2 text-sm bg-white min-h-[80px]"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="category">Flokkur</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-black rounded-md px-3 py-2 text-sm bg-white"
              required
            >
              <option value="">Veldu flokk…</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Verð áður</Label>
              <Input
                value={priceOriginal}
                onChange={(e) => setPriceOriginal(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Tilboðsverð</Label>
              <Input
                value={priceSale}
                onChange={(e) => setPriceSale(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Linkur til að kaupa</Label>
            <Input value={buyUrl} onChange={(e) => setBuyUrl(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          <div className="space-y-2">
            <Label>Mynd</Label>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
            {imagePreview && (
              <img
                src={imagePreview}
                className="w-full max-h-60 object-cover rounded-md border mt-2"
              />
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Bý til tilboð..." : "Búa til tilboð"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
