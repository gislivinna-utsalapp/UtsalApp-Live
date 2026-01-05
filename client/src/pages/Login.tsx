// client/src/pages/Login.tsx
import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg("Vantar netfang og lykilorð.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Notum central login úr AuthProvider
      await login(email.trim(), password.trim());

      // Eftir vel heppnaða innskráningu:
      // Farðu frekar á /profile (ekki forsíðu)
      navigate("/profile", { replace: true });
    } catch (err) {
      console.error("login error:", err);
      let msg =
        err instanceof Error
          ? err.message
          : "Tókst ekki að skrá inn. Vinsamlegast reyndu aftur.";

      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <Card className="w-full max-w-xs sm:max-w-sm p-6 space-y-6">
        <div className="text-center space-y-2">
          <img
            src="/utsalapp-logo.jpg"
            alt="ÚtsalApp"
            className="mx-auto w-32 h-auto mb-1"
          />
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
            disabled={isSubmitting}
          >
            {isSubmitting ? "Skrái inn..." : "Skrá inn"}
          </Button>
        </form>

        <div className="text-center text-xs text-muted-foreground space-y-1">
          <p>Áttirðu ekki aðgang áður?</p>
          <Link
            to="/register-store"
            className="text-[#FF7300] font-medium hover:underline"
          >
            Skrá verslun
          </Link>
        </div>
      </Card>
    </div>
  );
}
