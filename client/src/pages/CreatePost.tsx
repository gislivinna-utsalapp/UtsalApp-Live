import React, { FormEvent, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  imageUrl: string; // relative, t.d. "/uploads/xxx.jpg"
};

export default function CreatePost() {
  const navigate = useNavigate();

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
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewImageSrc = useMemo(() => {
    if (!form.imageUrl) return "";
    return API_BASE_URL ? `${API_BASE_URL}${form.imageUrl}` : form.imageUrl;
  }, [form.imageUrl]);

  async function handleImageUpload(file: File) {
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      // ✅ MUST match server route: upload.single("file")
      formData.append("file", file);

      const data = await apiUpload<{ url: string }>(
        "/api/v1/uploads",
        formData,
      );

      if (!data?.url)
        throw new Error("Upload tókst en server skilaði ekki url.");

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

    if (isUploading) {
      setError("Bíddu aðeins – mynd er enn að hlaðast upp.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Serverinn þinn (routes.ts) vill priceOriginal/priceSale/starsAt/endsAt/category (og title).
      // Þinn UI form notar originalPrice/discountedPrice/startDate/endDate.
      // Við map-um það yfir á server-format án þess að breyta öðru.
      const payload: any = {
        title: form.title,
        description: form.description,
        category: form.category || null,

        priceOriginal: form.originalPrice ? Number(form.originalPrice) : null,
        priceSale: form.discountedPrice ? Number(form.discountedPrice) : null,

        startsAt: form.startDate || null,
        endsAt: form.endDate || null,

        images: form.imageUrl ? [{ url: form.imageUrl }] : [],
      };

      await apiFetch("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      navigate("/profile");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Eitthvað fór úrskeiðis við að búa til tilboð");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 bg-background text-foreground">
      <Card className="p-4 space-y-4 bg-card text-card-foreground border border-border">
        <h1 className="text-xl font-semibold text-foreground">Nýtt tilboð</h1>

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
              placeholder="T.d. 40% afsláttur"
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
              placeholder="Stutt lýsing á tilboðinu"
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
              placeholder="T.d. Fatnaður"
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
                placeholder="T.d. 40"
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
                placeholder="T.d. 19990"
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
                placeholder="T.d. 11990"
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
            {isSubmitting ? "Vista…" : "Vista tilboð"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
