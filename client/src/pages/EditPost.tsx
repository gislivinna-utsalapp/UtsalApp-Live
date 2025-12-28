import React, { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { apiFetch, apiUpload, API_BASE_URL } from "@/lib/api";

// shadcn/ui:
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type FormState = {
  title: string;
  description: string;
  category: string;
  discountPercent: string;
  originalPrice: string;
  discountedPrice: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
};

type PostApi = {
  id: string;
  title?: string;
  description?: string;
  category?: string | null;
  // backend skilar mapPostToFrontend:
  // priceOriginal/priceSale heita í mapPostToFrontend: priceOriginal & priceSale? (þú notar priceOriginal/priceSale þar)
  // en í PostApi hjá þér var discountPercent/originalPrice/discountedPrice/startDate/endDate
  // Við lesum bara images/title/desc/category hér og skiljum rest eftir eins og þú varst með.
  discountPercent?: number | null;
  originalPrice?: number | null;
  discountedPrice?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  images?: Array<{ url: string }>;
};

export default function EditPost() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    category: "",
    discountPercent: "",
    originalPrice: "",
    discountedPrice: "",
    startDate: "",
    endDate: "",
    imageUrl: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewImageSrc = useMemo(() => {
    if (!form.imageUrl) return "";
    return API_BASE_URL ? `${API_BASE_URL}${form.imageUrl}` : form.imageUrl;
  }, [form.imageUrl]);

  useEffect(() => {
    if (!id) return;

    (async () => {
      setError(null);
      setLoaded(false);

      try {
        const post = await apiFetch<PostApi>(`/api/v1/posts/${id}`, {
          method: "GET",
        });

        const firstImg = post?.images?.[0]?.url || "";

        setForm({
          title: post?.title || "",
          description: post?.description || "",
          category: (post?.category as any) || "",
          discountPercent:
            post?.discountPercent === null ||
            post?.discountPercent === undefined
              ? ""
              : String(post.discountPercent),
          originalPrice:
            post?.originalPrice === null || post?.originalPrice === undefined
              ? ""
              : String(post.originalPrice),
          discountedPrice:
            post?.discountedPrice === null ||
            post?.discountedPrice === undefined
              ? ""
              : String(post.discountedPrice),
          startDate: post?.startDate || "",
          endDate: post?.endDate || "",
          imageUrl: firstImg,
        });

        setLoaded(true);
      } catch (err: any) {
        console.error(err);
        setError(err?.message || "Tókst ekki að sækja tilboð");
      } finally {
        setLoaded(true);
      }
    })();
  }, [id]);

  async function handleImageUpload(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      // Samræmt við server: upload.single("file")
      formData.append("file", file);

      const data = await apiUpload<{ url: string }>(
        "/api/v1/uploads",
        formData,
      );

      if (!data?.url) {
        throw new Error("Upload tókst en server skilaði ekki url.");
      }

      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Tókst ekki að hlaða upp mynd");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;

    if (isUploading) {
      setError("Bíddu aðeins – mynd er enn að hlaðast upp.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        category: form.category || "",

        // Samræmt við backend update route sem notar priceOriginal/priceSale
        priceOriginal: form.originalPrice
          ? Number(form.originalPrice)
          : undefined,
        priceSale: form.discountedPrice
          ? Number(form.discountedPrice)
          : undefined,

        startsAt: form.startDate || null,
        endsAt: form.endDate || null,

        images: form.imageUrl ? [{ url: form.imageUrl }] : [],
      };

      await apiFetch(`/api/v1/posts/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      navigate("/profile");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Eitthvað fór úrskeiðis við að uppfæra tilboð");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!loaded && !error) {
    return (
      <div className="max-w-xl mx-auto p-4 bg-background text-foreground">
        <p className="text-sm text-muted-foreground">Sæki tilboð…</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4 bg-background text-foreground">
      <Card className="p-4 space-y-4 bg-card text-card-foreground border border-border">
        <h1 className="text-xl font-semibold text-foreground">
          Breyta tilboði
        </h1>

        {error && (
          <div className="text-sm text-destructive bg-muted border border-border rounded p-2">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Titill</label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((p) => ({ ...p, title: e.target.value }))
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lýsing</label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Flokkur</label>
            <Input
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Afsláttur %</label>
              <Input
                value={form.discountPercent}
                onChange={(e) =>
                  setForm((p) => ({ ...p, discountPercent: e.target.value }))
                }
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Upphaflegt verð</label>
              <Input
                value={form.originalPrice}
                onChange={(e) =>
                  setForm((p) => ({ ...p, originalPrice: e.target.value }))
                }
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Afsláttarverð</label>
              <Input
                value={form.discountedPrice}
                onChange={(e) =>
                  setForm((p) => ({ ...p, discountedPrice: e.target.value }))
                }
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Gildir frá</label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, startDate: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm font-medium">Gildir til</label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, endDate: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Mynd</label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImageUpload(f);
              }}
              disabled={isUploading || isSubmitting}
            />

            {isUploading && (
              <p className="text-sm text-muted-foreground">Hleð upp mynd…</p>
            )}

            {previewImageSrc && (
              <div className="border border-border rounded overflow-hidden">
                <img
                  src={previewImageSrc}
                  alt="Preview"
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isUploading}
            className="w-full"
          >
            {isSubmitting ? "Vista…" : "Vista breytingar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
