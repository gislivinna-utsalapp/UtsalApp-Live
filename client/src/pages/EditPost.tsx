// client/src/pages/EditPost.tsx
import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiFetch, API_BASE_URL } from "@/lib/api";
import type { SalePostWithDetails } from "@shared/schema";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Sama og í CreatePost – mikilvægt að halda þessu samræmdu
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
  "Veitingar & matur",
  "Viðburðir",
  "Happy Hour",
];

type EditPostFormState = {
  title: string;
  description: string;
  category: string;
  discountPercent: string;
  originalPrice: string;
  discountedPrice: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null; // relative slóð
};

export function EditPost() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<EditPostFormState>({
    title: "",
    description: "",
    category: "",
    discountPercent: "",
    originalPrice: "",
    discountedPrice: "",
    startDate: "",
    endDate: "",
    imageUrl: null,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sækjum núverandi tilboð til að fylla í formið
  useEffect(() => {
    let cancelled = false;

    async function loadPost() {
      if (!id) return;
      setError(null);

      try {
        const post = await apiFetch<SalePostWithDetails>(`/api/v1/posts/${id}`);

        if (cancelled) return;

        const firstImageUrl =
          post.images && post.images.length > 0 ? post.images[0].url : null;

        setForm({
          title: post.title ?? "",
          description: post.description ?? "",
          category: post.category ?? "",
          discountPercent:
            post.discountPercent != null ? String(post.discountPercent) : "",
          originalPrice:
            post.originalPrice != null ? String(post.originalPrice) : "",
          discountedPrice:
            post.discountedPrice != null ? String(post.discountedPrice) : "",
          startDate: post.startDate ? post.startDate.slice(0, 10) : "",
          endDate: post.endDate ? post.endDate.slice(0, 10) : "",
          imageUrl: firstImageUrl,
        });

        setLoaded(true);
      } catch (err: any) {
        console.error(err);
        setError(
          err.message || "Tókst ekki að sækja tilboðið fyrir breytingar",
        );
      }
    }

    loadPost();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const uploadUrl = API_BASE_URL
        ? `${API_BASE_URL}/api/v1/uploads`
        : "/api/v1/uploads";

      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Tókst ekki að hlaða upp mynd");
      }

      const data: { url: string } = await res.json();

      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Tókst ekki að hlaða upp mynd");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        category: form.category || null,
        discountPercent: form.discountPercent
          ? Number(form.discountPercent)
          : null,
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        discountedPrice: form.discountedPrice
          ? Number(form.discountedPrice)
          : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        images: form.imageUrl ? [{ url: form.imageUrl }] : [],
      };

      await apiFetch(`/api/v1/posts/${id}`, {
        method: "PUT",
        body: payload,
      });

      navigate("/profile"); // eða linkinn sem þú vilt fara á eftir edit
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Eitthvað fór úrskeiðis við að uppfæra tilboð");
    } finally {
      setIsSubmitting(false);
    }
  }

  const previewImageSrc =
    form.imageUrl &&
    (API_BASE_URL ? `${API_BASE_URL}${form.imageUrl}` : form.imageUrl);

  if (!loaded && !error) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <p className="text-sm text-gray-600">Sæki tilboð…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <Card className="p-4 space-y-4">
        <h1 className="text-xl font-semibold">Breyta tilboði</h1>

        {error && (
          <div className="text-sm text-red-600 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Titill</Label>
            <Input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Lýsing</Label>
            <textarea
              id="description"
              name="description"
              className="w-full border rounded px-3 py-2 text-sm"
              rows={4}
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label htmlFor="category">Flokkur</Label>
            <select
              id="category"
              name="category"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.category}
              onChange={handleChange}
            >
              <option value="">Veldu flokk</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="discountPercent">Afsláttur %</Label>
              <Input
                id="discountPercent"
                name="discountPercent"
                type="number"
                min={0}
                max={100}
                value={form.discountPercent}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="originalPrice">Upprunalegt verð</Label>
              <Input
                id="originalPrice"
                name="originalPrice"
                type="number"
                min={0}
                value={form.originalPrice}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="discountedPrice">Afsláttarverð</Label>
            <Input
              id="discountedPrice"
              name="discountedPrice"
              type="number"
              min={0}
              value={form.discountedPrice}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startDate">Gildir frá</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Gildir til</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Mynd</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
            {isUploading && (
              <p className="text-xs text-gray-500">Hleð upp mynd…</p>
            )}
            {previewImageSrc && (
              <img
                src={previewImageSrc}
                alt="Forskoðun"
                className="mt-2 rounded-md max-h-48 object-cover"
              />
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? "Vista breytingar…" : "Vista breytingar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default EditPost;
