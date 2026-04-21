// client/src/pages/Login.tsx
import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setErrorMsg("Vantar netfang og lykilorð.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(trimmedEmail, trimmedPassword);

      if (result?.user?.isAdmin) {
        navigate("/admin", { replace: true });
      } else if (result?.store) {
        navigate("/profile", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("login error:", err);
      const raw = err instanceof Error ? err.message : "";
      const isWrongCreds =
        raw.toLowerCase().includes("wrong") ||
        raw.toLowerCase().includes("rangt") ||
        raw.toLowerCase().includes("invalid") ||
        raw.toLowerCase().includes("not found");

      setErrorMsg(
        isWrongCreds
          ? "Rangt netfang eða lykilorð. Athugaðu hvort stórir og litlir stafir séu réttir."
          : raw || "Tókst ekki að skrá inn. Vinsamlegast reyndu aftur.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gray-50">
      <Card className="w-full max-w-xs sm:max-w-sm p-6 space-y-6">
        {/* Logo */}
        <div className="text-center">
          <img
            src="/utsalapp-logo.jpg"
            alt="ÚtsalApp"
            className="mx-auto w-32 h-auto mb-1"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        </div>

        {/* Error */}
        {errorMsg && (
          <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 leading-relaxed">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="email">Netfang</Label>
            <input
              id="email"
              type="text"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="verslun@daemi.is"
              data-testid="input-email"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Password with show/hide */}
          <div className="space-y-1">
            <Label htmlFor="password">Lykilorð</Label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                data-testid="input-password"
                className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                data-testid="button-toggle-password"
                aria-label={showPassword ? "Fela lykilorð" : "Sýna lykilorð"}
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />
                }
              </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Lykilorð eru stafastæð (A ≠ a)
            </p>
          </div>

          <Button
            type="submit"
            className="w-full bg-neutral-900 text-white border-none shadow-none ring-0 focus:ring-0"
            disabled={isSubmitting}
            data-testid="button-submit-login"
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
