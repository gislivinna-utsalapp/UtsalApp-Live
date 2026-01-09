// client/src/pages/EditPost.tsx
import { useEffect, useState, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Sama og í CreatePost – mikilvægt að flokkarnir passi
const CATEGORY_OPTIONS = [
  "Fatnaður - Konur",
  "Fatnaður - Karlar",
  "Fatnaður - Börn",
  "Skór",
  "Íþróttavörur",
  "Heimili & húsgögn",
  "Rafmagnstæki",
  "Snyrtivörur",
  "Leikföng & börn",
  "Matur & veitingar",
  "Happy Hour",
  "Annað",
];

type UpdatePostPayload = {
  title?: string;
  description?: string;
  category?: string;
  priceOriginal?: number;
  priceSale?: number;
  buyUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  images?: { url: string }[];
};

// Endurnýtum upload-token-lógík úr CreatePost
async function uploadImage(file: File): Promise<string> {
  const token =
    localStorage.getItem("utsalapp_token") || localStorage.getItem("token");

  if (!token) {
    throw new Error("Enginn token fannst. Skráðu þig út og inn aftur.");
  }

  const formData = new FormData();

  // 🔑 VERÐUR að heita "image"
  formData.append("image", file);

  const res = await fetch("/api/v1/uploads", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Upload response text (edit):", text);
    if (res.status === 401) {
      throw new Error("Ekki innskráður. Skráðu þig inn aftur.");
    }
    throw new Error("Tókst ekki að hlaða upp mynd.");
  }

  const data = (await res.json().catch(() => null)) as { url?: string } | null;
  if (!data?.url) {
    throw new Error("Server skilaði ekki myndaslóð.");
  }

  return data.url;
}

export default function EditPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form state
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
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sækja núverandi tilboð
  useEffect(() => {
    if (!id) {
      setLoading(false);
      setErrorMsg("Vantar auðkenni tilboðs.");
      return;
    }

    async function loadPost() {
      try {
        setLoading(true);
        setErrorMsg(null);

        // apiFetch skilar þegar JSON – ekki .json() hér!
        const post = await apiFetch<SalePostWithDetails>(`/api/v1/posts/${id}`);

        setTitle(post.title || "");
        setDescription(post.description || "");
        setCategory(post.category || "");
        setPriceOriginal(
          post.priceOriginal != null ? String(post.priceOriginal) : "",
        );
        setPriceSale(post.priceSale != null ? String(post.priceSale) : "");
        setBuyUrl(post.buyUrl || "");

        if (post.startsAt) {
          const d = new Date(post.startsAt);
          setStartsAt(d.toISOString().slice(0, 10));
        }
        if (post.endsAt) {
          const d = new Date(post.endsAt);
          setEndsAt(d.toISOString().slice(0, 10));
        }

        const img =
          post.images && post.images.length > 0 ? post.images[0].url : null;
        setExistingImageUrl(img);
        setImagePreview(img);
      } catch (err: any) {
        console.error("Villa við að sækja auglýsingu:", err);
        const msg =
          err instanceof Error
            ? err.message
            : "Tókst ekki að sækja auglýsinguna.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    loadPost();
  }, [id]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview(existingImageUrl);
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!id) {
      setErrorMsg("Vantar auðkenni tilboðs.");
      return;
    }

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

    setIsSubmitting(true);

    try {
      let finalImageUrl = existingImageUrl;

      // Upload aðeins ef ný mynd er valin
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile);
      }

      const payload: UpdatePostPayload = {
        title: title.trim(),
        description: description.trim(),
        category: category.trim(),
        priceOriginal: original,
        priceSale: sale,
        buyUrl: buyUrl.trim() || null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
      };

      // ✅ Mynd fer inn á réttan stað í payload
      if (finalImageUrl) {
        payload.images = [{ url: finalImageUrl }];
      } else {
        payload.images = [];
      }

      await apiFetch(`/api/v1/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setSuccessMsg("Tilboð uppfært.");
      setTimeout(() => {
        navigate("/profile");
      }, 800);
    } catch (err: any) {
      console.error("Villa við að uppfæra tilboð:", err);
      const msg =
        err instanceof Error ? err.message : "Tókst ekki að uppfæra tilboð.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ✅ LAGFÆRINGIN: Hér var áður tvítekinn kóði með `await` fyrir utan handleSubmit.
  // Hann er fjarlægður svo build detti ekki út.

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <p className="text-sm text-gray-500">Sæki tilboð…</p>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
        <p className="text-sm text-red-600">Vantar auðkenni tilboðs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 pt-4">
      <h1 className="text-lg font-semibold mb-3">Breyta tilboði</h1>

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
          {/* Titill */}
          <div className="space-y-1">
            <Label htmlFor="title">Titill tilboðs</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Lýsing */}
          <div className="space-y-1">
            <Label htmlFor="description">Lýsing</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
            />
          </div>

          {/* Flokkur - dropdown */}
          <div className="space-y-1">
            <Label htmlFor="category">Flokkur</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
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

          {/* Verð */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="priceOriginal">Verð áður</Label>
              <Input
                id="priceOriginal"
                value={priceOriginal}
                onChange={(e) => setPriceOriginal(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="priceSale">Tilboðsverð</Label>
              <Input
                id="priceSale"
                value={priceSale}
                onChange={(e) => setPriceSale(e.target.value)}
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Linkur til kaupa */}
          <div className="space-y-1">
            <Label htmlFor="buyUrl">Linkur til að kaupa (vefsíða)</Label>
            <Input
              id="buyUrl"
              value={buyUrl}
              onChange={(e) => setBuyUrl(e.target.value)}
            />
          </div>

          {/* Dagssetningar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="startsAt">Byrjar (valkvætt)</Label>
              <Input
                id="startsAt"
                type="date"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endsAt">Endar (valkvætt)</Label>
              <Input
                id="endsAt"
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>

          {/* Mynd */}
          <div className="space-y-2">
            <Label htmlFor="image">Mynd fyrir tilboðið</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div className="mt-2">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Forskoðun:
                </p>
                <img
                  src={imagePreview}
                  alt="Forskoðun"
                  className="w-full max-h-60 object-cover rounded-md border"
                />
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Uppfæri tilboð..." : "Vista breytingar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
