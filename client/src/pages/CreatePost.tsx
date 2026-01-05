import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "@/lib/api";
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
  "Matur & veitingar",
  "Happy Hour",
  "Annað",
];

type CreatePostPayload = {
  title: string;
  description: string;
  // Fyrsti flokkurinn fyrir eldri backend-lógík
  category: string;
  // NÝTT: allt að 3 flokkar á hverju tilboði
  categories: string[];
  priceOriginal: number;
  priceSale: number;
  buyUrl?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  images: { url: string }[];
};

// Notum sama API_BASE_URL og annars staðar í appinu
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Hjálparfall til að hlaða upp mynd með token
async function uploadImage(file: File): Promise<string> {
  const token =
    localStorage.getItem("utsalapp_token") || localStorage.getItem("token");

  if (!token) {
    throw new Error("Enginn token fannst. Skráðu þig út og inn aftur.");
  }

  const formData = new FormData();
  formData.append("image", file);

  // Notum backend-URL í stað relative slóðar svo þetta virki á Netlify + Replit
  const url = API_BASE_URL
    ? `${API_BASE_URL}/api/v1/uploads`
    : "/api/v1/uploads";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      // EKKI setja Content-Type hér – browser sér um boundary fyrir FormData
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Upload response text:", text);
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

export default function CreatePost() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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

  function toggleCategory(cat: string) {
    setErrorMsg(null);

    setSelectedCategories((prev) => {
      const exists = prev.includes(cat);
      if (exists) {
        // taka flokk út
        return prev.filter((c) => c !== cat);
      }
      if (prev.length >= 3) {
        // hámark 3 flokkar
        setErrorMsg("Hægt er að velja mest 3 flokka fyrir hvert tilboð.");
        return prev;
      }
      return [...prev, cat];
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

    if (selectedCategories.length === 0) {
      setErrorMsg("Veldu að minnsta kosti einn flokk (allt að 3).");
      return;
    }

    const trimmedCategories = selectedCategories.map((c) => c.trim());
    const primaryCategory = trimmedCategories[0] ?? "";

    if (!primaryCategory) {
      setErrorMsg("Veldu giltan flokk.");
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
      // 1. Hlaða upp mynd og fá URL
      const imageUrl = await uploadImage(imageFile);

      // 2. Búa til payload fyrir /api/v1/posts
      const payload: CreatePostPayload = {
        title: title.trim(),
        description: description.trim(),
        category: primaryCategory, // fyrsti flokkurinn
        categories: trimmedCategories, // allt að 3 flokkar
        priceOriginal: original,
        priceSale: sale,
        buyUrl: buyUrl.trim() || null,
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        images: [{ url: imageUrl }],
      };

      // 3. Senda til server – búa til tilboð
      const created = await apiFetch<CreatePostPayload>("/api/v1/posts", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log("Post created:", created);

      setSuccessMsg("Tilboð var búið til.");
      // Smá töf svo notandi sjái skilaboðin, svo á prófíl
      setTimeout(() => {
        navigate("/profile");
      }, 800);
    } catch (err: any) {
      console.error("Villa við að búa til auglýsingu:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að búa til auglýsingu.";
      setErrorMsg(msg);
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
          {/* Titill */}
          <div className="space-y-1">
            <Label htmlFor="title">Titill tilboðs</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dæmi: 30% afsláttur af vetrarúlpum"
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
              placeholder="Stutt lýsing á tilboðinu…"
              className="w-full border border-black rounded-md px-3 py-2 text-sm text-black bg-white min-h-[80px]"
            />
          </div>

          {/* Flokkar - CHECKBOXAR (allt að 3) */}
          <div className="space-y-1">
            <Label>Flokkar (allt að 3)</Label>
            <div className="flex flex-col gap-1">
              {CATEGORY_OPTIONS.map((opt) => {
                const checked = selectedCategories.includes(opt);
                const disableCheckbox =
                  !checked && selectedCategories.length >= 3;

                return (
                  <label
                    key={opt}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      disabled={disableCheckbox}
                      onChange={() => toggleCategory(opt)}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Þú getur merkt tilboðið í allt að þrjá flokka.
            </p>
          </div>

          {/* Verð */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="priceOriginal">Verð áður</Label>
              <Input
                id="priceOriginal"
                value={priceOriginal}
                onChange={(e) => setPriceOriginal(e.target.value)}
                placeholder="t.d. 14990"
                inputMode="decimal"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="priceSale">Tilboðsverð</Label>
              <Input
                id="priceSale"
                value={priceSale}
                onChange={(e) => setPriceSale(e.target.value)}
                placeholder="t.d. 9990"
                inputMode="decimal"
                required
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
              placeholder="https://verslun.is/tilbod"
            />
            <p className="text-[11px] text-muted-foreground">
              Notendur fara á þessa slóð þegar þeir smella á „Smelltu hér til að
              kaupa“.
            </p>
          </div>

          {/* Dagssetningar (valkvætt) */}
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

          {/* Submit */}
          <Button
            type="submit"
            className="w-full bg-[#FF7300] hover:bg-[#e56600] text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Bý til tilboð..." : "Búa til tilboð"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
