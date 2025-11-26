// client/src/pages/CreatePost.tsx

import { FormEvent, useState, ChangeEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function CreatePost() {
  const { authUser, loading } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("annad");
  const [priceOriginal, setPriceOriginal] = useState("");
  const [priceSale, setPriceSale] = useState("");
  const [buyUrl, setBuyUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ---------- Auth gating ----------

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Hleð innskráningarstöðu...
      </div>
    );
  }

  // Ekki innskráð(ur) sem verslun
  if (!authUser || authUser.user.role !== "store") {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold">Búa til nýtt tilboð</h1>
        <p className="text-sm text-muted-foreground">
          Þú þarft að vera innskráð(ur) sem verslun til að búa til útsölutilboð.
        </p>
        <div className="space-y-2">
          <Link to="/login">
            <Button className="w-full">Skrá inn</Button>
          </Link>
          <Link to="/register-store">
            <Button className="w-full" variant="outline">
              Stofna verslun
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Verslun en ekki búin að virkja fríviku/pakka
  const billingActive = (authUser.store as any)?.billingActive ?? false;

  if (!billingActive) {
    return (
      <div className="min-h-screen pb-24">
        <header className="p-4 border-b border-border">
          <h1 className="text-2xl font-bold">Búa til nýtt tilboð</h1>
        </header>

        <main className="p-4 max-w-xl mx-auto">
          <Card className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Virkjaðu fríviku fyrst</h2>
            <p className="text-sm text-muted-foreground">
              Til að geta búið til útsölutilboð þarftu fyrst að virkja 7 daga
              fríviku og velja pakka á prófílsíðunni þinni.
            </p>
            <p className="text-sm text-muted-foreground">
              Farðu á <span className="font-medium">Prófíl</span> &rarr;{" "}
              <span className="font-medium">„Áskrift &amp; frívika“</span> og
              smelltu á{" "}
              <span className="font-medium">„Virkja pakka og fríviku“</span>.
              Eftir það geturðu búið til tilboð.
            </p>

            <Link to="/profile">
              <Button className="w-full">
                Fara á prófíl og virkja fríviku
              </Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  // ---------- Mynd preview ----------

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);

    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  }

  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append("image", imageFile);

    const token = localStorage.getItem("utsalapp_token");

    const res = await fetch("/api/v1/uploads", {
      method: "POST",
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Tókst ekki að hlaða upp mynd.");
    }

    if (!data.url) {
      throw new Error("Myndaupphleðsla skilaði engri slóð.");
    }

    return data.url as string;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const token = localStorage.getItem("utsalapp_token");

      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadImageIfNeeded();
      }

      const body: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        priceOriginal: Number(priceOriginal),
        priceSale: Number(priceSale),
        startsAt: startsAt || null,
        endsAt: endsAt || null,
        buyUrl: buyUrl.trim() || null,
        images: imageUrl
          ? [
              {
                url: imageUrl,
                alt: title.trim() || undefined,
              },
            ]
          : [],
      };

      const res = await fetch("/api/v1/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Tókst ekki að búa til tilboð.");
      }

      setSuccess("Tilboð var búið til.");
      setTimeout(() => {
        navigate("/profile");
      }, 900);
    } catch (err: any) {
      setError(err?.message || "Villa kom upp.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold">Búa til nýtt tilboð</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fylltu inn upplýsingar um tilboðið.
        </p>
      </header>

      <main className="p-4 max-w-xl mx-auto">
        <Card className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Titill</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border w-full p-2 rounded text-sm"
                placeholder="T.d. Vorútsala – Kjólar"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Lýsing</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border w-full p-2 rounded text-sm"
                placeholder="Stutt lýsing..."
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Flokkur</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border w-full p-2 rounded text-sm"
              >
                <option value="fatnadur">Fatnaður</option>
                <option value="heimili">Heimili</option>
                <option value="rafmagn">Raftæki</option>
                <option value="heilsa">Heilsa</option>
                <option value="veitingar">Veitingar</option>
                <option value="snyrtivorur">Snyrtivörur</option>
                <option value="annad">Annað</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Slóð á vöruna (valkvætt)
              </label>
              <input
                type="url"
                value={buyUrl}
                onChange={(e) => setBuyUrl(e.target.value)}
                className="border w-full p-2 rounded text-sm"
                placeholder="https://vefverslun.is/vara123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Mynd af vörunni
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-sm"
              />

              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Forskoðun"
                    className="w-full max-h-56 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fyrra verð
                </label>
                <input
                  type="number"
                  min="0"
                  value={priceOriginal}
                  onChange={(e) => setPriceOriginal(e.target.value)}
                  className="border w-full p-2 rounded text-sm"
                  placeholder="12990"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Útsöluverð
                </label>
                <input
                  type="number"
                  min="0"
                  value={priceSale}
                  onChange={(e) => setPriceSale(e.target.value)}
                  className="border w-full p-2 rounded text-sm"
                  placeholder="6990"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Byrjar</label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="border w-full p-2 rounded text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Endar</label>
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="border w-full p-2 rounded text-sm"
                  required
                />
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Vista tilboð..." : "Vista tilboð"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
