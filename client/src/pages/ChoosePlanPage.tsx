import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Plan = "basic" | "pro" | "premium";

export default function ChoosePlanPage() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!selectedPlan) {
      setError("Vinsamlegast veldu pakka");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/v1/stores/select-plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // ⬅️ session-cookie fer nú með
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (res.status === 401) {
        throw new Error("Þú þarft að vera innskráð(ur) til að velja pakka.");
      }

      if (res.status === 403) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.message || "Þú hefur ekki heimild til að velja pakka.",
        );
      }

      if (!res.ok) {
        throw new Error("Ekki tókst að vista pakka. Reyndu aftur.");
      }

      // 👉 greiðsluskref kemur síðar
      navigate("/dashboard");
    } catch (err) {
      console.error("select-plan error:", err);
      setError(
        err instanceof Error ? err.message : "Villa kom upp. Reyndu aftur.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow p-8">
        <h1 className="text-2xl font-bold text-center mb-2">Veldu pakka</h1>
        <p className="text-center text-gray-600 mb-8">
          Veldu pakka til að halda áfram og byrja að búa til tilboð
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          <PlanCard
            title="Basic"
            price="10.900 kr / viku"
            description="Grunnbirting tilboða"
            selected={selectedPlan === "basic"}
            onClick={() => setSelectedPlan("basic")}
          />

          <PlanCard
            title="Pro"
            price="14.900 kr / viku"
            description="Meiri sýnileiki og betri staðsetning"
            selected={selectedPlan === "pro"}
            highlight
            onClick={() => setSelectedPlan("pro")}
          />

          <PlanCard
            title="Premium"
            price="20.900 kr / viku"
            description="Hámarks sýnileiki og forgangur"
            selected={selectedPlan === "premium"}
            onClick={() => setSelectedPlan("premium")}
          />
        </div>

        {error && <p className="text-red-600 text-center mt-6">{error}</p>}

        <div className="flex justify-center mt-8">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="px-8 py-3 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 disabled:opacity-50"
          >
            {loading ? "Vinn..." : "Halda áfram"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------ SUB COMPONENT ------------------ */

type PlanCardProps = {
  title: string;
  price: string;
  description: string;
  selected: boolean;
  highlight?: boolean;
  onClick: () => void;
};

function PlanCard({
  title,
  price,
  description,
  selected,
  highlight,
  onClick,
}: PlanCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        cursor-pointer border rounded-2xl p-6 transition
        ${selected ? "border-pink-600 ring-2 ring-pink-200" : "border-gray-200"}
        ${highlight ? "bg-pink-50" : "bg-white"}
        hover:shadow
      `}
    >
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-2xl font-semibold mb-2">{price}</p>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
