// client/src/pages/EditPost.tsx

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("utsalapp_token");

  const [postLoading, setPostLoading] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Gögn úr gagnagrunni
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
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // -------------------------------------------------------
  //  Sækja tilboðið sem við erum að breyta
  // -------------------------------------------------------
  useEffect(() => {
    async function loadPost() {
      try {
        const res = await fetch(`/api/v1/posts/${id}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Fékk ekki tilboðið.");
          return;
        }

        setTitle(data.title || "");
        setDescription(data.description || "");
        setCategory(data.category || "annad");

        setPriceOriginal(String(data.priceOriginal));
        setPriceSale(String(data.priceSale));

        setBuyUrl(data.buyUrl || "");

        setStartsAt(data.startsAt?.slice(0, 10) || "");
        setEndsAt(data.endsAt?.slice(0, 10) || "");

        if (data.images?.length > 0) {
          setExistingImageUrl(data.images[0].url);
        }
      } catch (err) {
        console.error("Load post error:", err);
        setError("Villa kom upp við að sækja tilboðið.");
      } finally {
        setPostLoading(false);
      }
    }

    loadPost();
  }, [id]);

  // -------------------------------------------------------
  //  Mynd – forskoðun
  // -------------------------------------------------------
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

  // -------------------------------------------------------
  //  Hlaða upp mynd ef þarf
  // -------------------------------------------------------
  async function uploadImageIfNeeded(): Promise<string | null> {
    if (!imageFile) return existingImageUrl;

    const formData = new FormData();
    formData.append("image", imageFile);

    const res = await fetch("/api/v1/uploads", {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Tókst ekki að hlaða upp mynd.");
    }

    return data.url;
  }

  // -------------------------------------------------------
  //  Vista breytingar
  // -------------------------------------------------------
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const imageUrl = await uploadImageIfNeeded();

      const body: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        priceOriginal: Number(priceOriginal),
        priceSale: Number(priceSale),
        startsAt,
        endsAt,
        buyUrl: buyUrl.trim() || null,
        images: imageUrl ? [{ url: imageUrl, alt: title.trim() }] : [],
      };

      const res = await fetch(`/api/v1/posts/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Tókst ekki að uppfæra tilboðið.");
      }

      setSuccess("Tilboði var breytt.");
      setTimeout(() => navigate("/profile"), 900);
    } catch (err: any) {
      setError(err.message || "Villa kom upp.");
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  //  UI
  // -------------------------------------------------------
  if (postLoading) {
    return (
      <div className="min-h-screen p-6 pb-24">
        <p className="text-sm text-muted-foreground">Sæki tilboð...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold">Breyta tilboði</h1>
      </header>

      <main className="p-4 max-w-xl mx-auto">
        <Card className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* TITILL */}
            <div>
              <label className="text-sm font-medium">Titill</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border w-full p-2 rounded text-sm"
                required
              />
            </div>

            {/* LÝSING */}
            <div>
              <label className="text-sm font-medium">Lýsing</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="border w-full p-2 rounded text-sm"
              />
            </div>

            {/* FLOKKUR */}
            <div>
              <label className="text-sm font-medium">Flokkur</label>
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

            {/* KAUP-LINK */}
            <div>
              <label className="text-sm font-medium">Slóð á vöruna</label>
              <input
                type="url"
                value={buyUrl}
                onChange={(e) => setBuyUrl(e.target.value)}
                className="border w-full p-2 rounded text-sm"
                placeholder="https://vefverslun.is/vara123"
              />
            </div>

            {/* MYND */}
            <div>
              <label className="text-sm font-medium">Mynd</label>
              <input type="file" accept="image/*" onChange={handleFileChange} />

              {(imagePreview || existingImageUrl) && (
                <div className="mt-2">
                  <img
                    src={imagePreview || existingImageUrl!}
                    className="w-full max-h-56 object-cover rounded border"
                  />
                </div>
              )}
            </div>

            {/* VERÐ */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Fyrra verð</label>
                <input
                  type="number"
                  value={priceOriginal}
                  onChange={(e) => setPriceOriginal(e.target.value)}
                  className="border w-full p-2 rounded"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Útsöluverð</label>
                <input
                  type="number"
                  value={priceSale}
                  onChange={(e) => setPriceSale(e.target.value)}
                  className="border w-full p-2 rounded"
                  required
                />
              </div>
            </div>

            {/* DAGSETNINGAR */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Byrjar</label>
                <input
                  type="date"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="border w-full p-2 rounded"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium">Endar</label>
                <input
                  type="date"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                  className="border w-full p-2 rounded"
                  required
                />
              </div>
            </div>

            {/* VILLUR & SUCCESS */}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && <p className="text-sm text-emerald-600">{success}</p>}

            {/* VISTA */}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Vista breytingar..." : "Vista breytingar"}
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
