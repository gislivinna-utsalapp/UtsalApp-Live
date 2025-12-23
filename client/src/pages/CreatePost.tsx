// client/src/pages/CreatePost.tsx
import { FormEvent, useState, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Flokkar sem notandinn velur úr (uppfært: Raftæki + Happy Hour)
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

type CreatePostFormState = {
  title: string;
  description: string;
  category: string;
  discountPercent: string;
  originalPrice: string;
  discountedPrice: string;
  startDate: string;
  endDate: string;
  imageUrl: string | null; // relative url frá server, t.d. "/uploads/xxx.jpg"
};

export function CreatePost() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState<CreatePostFormState>({
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

      // Geymum bara relative slóðina sem serverinn skilar (t.d. "/uploads/xxx.jpg")
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

      if (user?.storeId) {
        payload.storeId = user.storeId;
      }

      await apiFetch("/api/v1/posts", {
        method: "POST",
        body: payload,
      });

      navigate("/profile");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Eitthvað fór úrskeiðis við að búa til tilboð");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper til að byggja fulla slóð á mynd fyrir preview
  const previewImageSrc =
    form.imageUrl &&
    (API_BASE_URL ? `${API_BASE_URL}${form.imageUrl}` : form.imageUrl);

  return (
    <div className="max-w-xl mx-auto p-4 bg-background text-foreground">
      <Card className="p-4 space-y-4 bg-card text-card-foreground border border-border">
        <h1 className="text-xl font-semibold text-foreground">Nýtt tilboð</h1>

        {error && (
          <div className="text-sm text-destructive bg-muted border border-border rounded p-2">
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
              className="bg-card text-foreground border border-border"
            />
          </div>

          <div>
            <Label htmlFor="description">Lýsing</Label>
            <textarea
              id="description"
              name="description"
              className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
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
              className="w-full rounded border border-border bg-card px-3 py-2 text-sm text-foreground"
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
            <p className="mt-1 text-[11px] text-muted-foreground">
              Veldu flokk sem passar best við tilboðið.
            </p>
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
                className="bg-card text-foreground border border-border"
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
                className="bg-card text-foreground border border-border"
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
              className="bg-card text-foreground border border-border"
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
                className="bg-card text-foreground border border-border"
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
                className="bg-card text-foreground border border-border"
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
              className="bg-card text-foreground border border-border"
            />

            {isUploading && (
              <p className="text-xs text-muted-foreground">Hleð upp mynd…</p>
            )}

            {previewImageSrc && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-2">Forskoðun</p>
                <img
                  src={previewImageSrc}
                  alt="Forskoðun"
                  className="rounded-md max-h-48 object-cover border border-border"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={isSubmitting || isUploading}
          >
            {isSubmitting ? "Vista…" : "Vista tilboð"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => navigate(-1)}
            disabled={isSubmitting || isUploading}
          >
            Hætta við
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default CreatePost;
