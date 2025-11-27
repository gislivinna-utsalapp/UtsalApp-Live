// client/src/pages/RegisterStore.tsx
import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";

interface RegisterResponse {
  id?: string;
  storeId?: string;
  message?: string;
}

export default function RegisterStore() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [website, setWebsite] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [createdStoreId, setCreatedStoreId] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== passwordConfirm) {
      setErrorMsg("Lykilorð passa ekki saman.");
      return;
    }

    setIsSubmitting(true);

    try {
      // AÐLAGA EF ÞITT API ER ÖÐRUVÍSI
      // Algeng endpoint nöfn hjá þér geta verið:
      // - /api/v1/stores/register
      // - /api/v1/auth/register-store
      // Veldu það sem þú ert með og breyttu hér ef þarf.
      const res = await apiFetch("/api/v1/stores/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          phone,
          address,
          website,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          text || "Tókst ekki að skrá verslun. Vinsamlegast reyndu aftur.",
        );
      }

      const data = (await res.json()) as RegisterResponse;

      setCreatedStoreId(data.storeId || data.id || null);
      setSuccessMsg(
        data.message ||
          "Verslun hefur verið skráð. Þú getur nú skráð þig inn sem verslun.",
      );

      // Hreinsa lykilorð úr formi
      setPassword("");
      setPasswordConfirm("");
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að skrá verslun. Vinsamlegast reyndu aftur.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <Card className="w-full max-w-xl p-6 space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/utsalapp-logo.jpg"
            alt="ÚtsalApp"
            className="mx-auto w-40 h-auto mb-1"
          />
          <h1 className="text-lg font-semibold">Skrá verslun í ÚtsalApp</h1>
          <p className="text-xs text-muted-foreground">
            Skráðu verslunina þína til að setja inn útsölutilboð sem birtast í
            ÚtsalApp.
          </p>
        </div>

        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="space-y-2">
            <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
              <p className="font-medium mb-1">Skráning tókst!</p>
              <p>{successMsg}</p>
              {createdStoreId && (
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Kennimerki verslunar: <strong>{createdStoreId}</strong>
                </p>
              )}
            </div>

            {/* HÉR er “Skrá inn” TAKKIN sem FER ALLTAF Á /login */}
            <div className="flex justify-center">
              <Link to="/login">
                <Button className="bg-[#FF7300] hover:bg-[#e56600] text-white text-xs">
                  Skrá inn
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Formið er enn sýnilegt til að laga villur / breyta – það er í lagi */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="name">Nafn verslunar</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dæmi: Fatahornið"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Netfang verslunar</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="verslun@daemi.is"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Símanúmer</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Símanúmer verslunar"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="website">Vefsíða (valkvætt)</Label>
              <Input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://verslun.is"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="address">Heimilisfang</Label>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Heimilisfang / staðsetning verslunar"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">Lykilorð</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="passwordConfirm">Staðfesta lykilorð</Label>
              <Input
                id="passwordConfirm"
                type="password"
                autoComplete="new-password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#FF7300] hover:bg-[#e56600] text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Skrái verslun..." : "Skrá verslun"}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Ertu nú þegar með aðgang?</p>
          <Link
            to="/login"
            className="text-[#FF7300] font-medium hover:underline"
          >
            Skrá inn
          </Link>
        </div>
      </Card>
    </div>
  );
}
