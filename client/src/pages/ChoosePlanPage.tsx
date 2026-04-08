import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CheckCircle2 } from "lucide-react";

export default function ChoosePlanPage() {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("utsalapp_token") ||
        localStorage.getItem("token") ||
        ""
      : "";

  async function handleContinue() {
    if (!token) {
      setError("Þú þarft að vera innskráð(ur) til að halda áfram. Vinsamlegast skráðu þig inn.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await apiFetch("/api/v1/stores/select-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan: "unlimited" }),
      });

      navigate("/profile", { replace: true });
    } catch (err) {
      console.error("select-plan error:", err);
      setError(err instanceof Error ? err.message : "Villa kom upp. Reyndu aftur.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Hleð...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow p-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Veldu áskrift</h1>
          <p className="text-gray-600">
            Byrjaðu með 7 daga frí prufuviku — engin greiðsla þarf núna.
          </p>
        </div>

        <div className="border-2 border-pink-600 rounded-2xl p-6 bg-pink-50 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold">Ótakmarkaðar auglýsingar</h2>
            <span className="text-xs bg-pink-600 text-white px-3 py-1 rounded-full font-medium">
              7 daga frí prufuvika
            </span>
          </div>

          <div>
            <span className="text-3xl font-bold">59.900 kr</span>
            <span className="text-gray-500 text-sm ml-1">+ VSK / mán</span>
          </div>

          <ul className="space-y-2 text-sm text-gray-700">
            {[
              "Ótakmarkaður fjöldi auglýsinga",
              "Fullt aðgengi að öllum eiginleikum",
              "Logo og upplýsingar verslunar",
              "Verslunarsíða sýnileg notendum",
              "Hægt að hætta hvenær sem er",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-pink-600 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {error && <p className="text-red-600 text-center text-sm">{error}</p>}

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full py-3 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-50 transition-colors"
          data-testid="button-choose-plan-continue"
        >
          {loading ? "Vinn..." : "Hefja 7 daga frí prufuviku"}
        </button>

        <p className="text-center text-xs text-gray-400">
          Engin greiðsluupplýsingar þarf á þessum tímapunkti.
        </p>
      </div>
    </div>
  );
}
