// client/src/pages/RegisterStore.tsx
import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export default function RegisterStore() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [storeName, setStoreName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!storeName.trim() || !email.trim() || !password.trim()) {
      setError("Fylltu út verslunarheiti, netfang og lykilorð.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) Skrá nýja verslun
      const res = await fetch("/api/v1/auth/register-store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName: storeName.trim(),
          email: email.trim(),
          password: password.trim(),
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.message || "Tókst ekki að búa til verslunarprófíl.",
        );
      }

      // 2) Logga strax inn með sömu upplýsingum
      await login(email.trim(), password.trim());

      // 3) Fara á prófíl
      navigate("/profile");
    } catch (err: any) {
      console.error("Register store error:", err);
      setError(err?.message || "Villa kom upp við skráningu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold">Búa til verslunarprófíl</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Skráðu verslunina þína til að geta sett inn útsölutilboð í ÚtsalApp.
        </p>
      </header>

      <main className="p-4 max-w-md mx-auto">
        <Card className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Verslunarupplýsingar */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Heiti verslunar
                </label>
                <input
                  type="text"
                  className="border w-full p-2 rounded text-sm"
                  placeholder="T.d. LitaBúðin"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Heimilisfang (valkvætt)
                </label>
                <input
                  type="text"
                  className="border w-full p-2 rounded text-sm"
                  placeholder="T.d. Kringlan 7, 103 Reykjavík"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Sími (valkvætt)
                </label>
                <input
                  type="tel"
                  className="border w-full p-2 rounded text-sm"
                  placeholder="T.d. 511 0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Vefsíða (valkvætt)
                </label>
                <input
                  type="url"
                  className="border w-full p-2 rounded text-sm"
                  placeholder="T.d. https://verslun.is"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>
            </div>

            {/* Aðgangsupplýsingar */}
            <div className="pt-2 space-y-3 border-t border-border">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Netfang
                </label>
                <input
                  type="email"
                  className="border w-full p-2 rounded text-sm"
                  placeholder="verslun@daemi.is"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Lykilorð
                </label>
                <input
                  type="password"
                  className="border w-full p-2 rounded text-sm"
                  placeholder="Veldu öflugt lykilorð"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive whitespace-pre-line">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Stofna verslun..." : "Stofna verslun"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center">
            Þegar með aðgang?{" "}
            <Link to="/login" className="underline">
              Skráðu þig inn hér
            </Link>
          </p>
        </Card>
      </main>
    </div>
  );
}
