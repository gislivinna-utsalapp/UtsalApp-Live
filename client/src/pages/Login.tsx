// client/src/pages/Login.tsx
import { useState, useEffect, FormEvent } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authUser, login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ef notandi er þegar innskráður → senda beint á /profile
  useEffect(() => {
    if (authUser) {
      navigate("/profile", { replace: true });
    }
  }, [authUser, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);

    try {
      // notar login() úr auth.ts
      await login(email, password);

      // Sækjum "from" frá PrivateRoute ef til er
      const from =
        (location.state as any)?.from &&
        (location.state as any).from !== "/login"
          ? (location.state as any).from
          : "/profile";

      navigate(from, { replace: true });
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error
          ? err.message
          : "Innskráning mistókst. Vinsamlegast reyndu aftur.";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/utsalapp-logo.jpg"
            alt="ÚtsalApp"
            className="mx-auto w-40 h-auto mb-1"
          />
          <h1 className="text-lg font-semibold">Innskráning verslunar</h1>
          <p className="text-xs text-muted-foreground">
            Skráðu þig inn til að setja inn útsölutilboð og stýra auglýsingunum
            þínum.
          </p>
        </div>

        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Netfang</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="verslun@daemi.is"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Lykilorð</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-[#FF7300] hover:bg-[#e56600] text-white"
            disabled={submitting || loading}
          >
            {submitting || loading ? "Skrái inn..." : "Skrá inn"}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Ertu ekki með aðgang?</p>
          <Link
            to="/register-store"
            className="text-[#FF7300] font-medium hover:underline"
          >
            Stofna verslun í ÚtsalApp
          </Link>
        </div>
      </Card>
    </div>
  );
}
