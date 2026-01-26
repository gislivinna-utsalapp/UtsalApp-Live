// client/src/pages/PricingPage.tsx
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BILLING_COPY } from "@/lib/billingCopy";

type PlanKey = "basic" | "pro" | "premium";

const PLANS: Array<{
  key: PlanKey;
  title: string;
  price: string;
  bullets: string[];
  highlight?: boolean;
}> = [
  {
    key: "basic",
    title: "Basic",
    price: "12.000 kr / mán",
    bullets: [
      "Grunnsýnileiki fyrir tilboð",
      "Aðgangur að birtingu tilboða",
      "Hægt að breyta eða hætta hvenær sem er",
    ],
  },
  {
    key: "pro",
    title: "Pro",
    price: "22.000 kr / mán",
    bullets: [
      "Meiri sýnileiki og betri staðsetning",
      "Hentar verslunum með regluleg tilboð",
      "Hægt að breyta eða hætta hvenær sem er",
    ],
    highlight: true,
  },
  {
    key: "premium",
    title: "Premium",
    price: "32.000 kr / mán",
    bullets: [
      "Hámarks sýnileiki",
      "Fyrir verslanir sem vilja ná mestum árangri",
      "Hægt að breyta eða hætta hvenær sem er",
    ],
  },
];

export default function PricingPage() {
  const contactEmail = "hello@utsalapp.is"; // breyttu í þinn póst
  const subject = encodeURIComponent("Pakkaval – ÚtsalApp");
  const baseBody = (plan: string) =>
    encodeURIComponent(
      `Sæl/sæll,\n\nÉg vil virkja aðgang að ÚtsalApp.\nPakkaval: ${plan}\nVerslun: \nKennitala (ef við á): \nSími: \n\nTakk!\n`,
    );

  return (
    <main className="space-y-6">
      <Card className="p-5 space-y-2">
        <h1 className="text-xl font-bold">
          Pakkar fyrir verslanir sem vilja selja meira
        </h1>
        <p className="text-sm text-muted-foreground">
          Greitt aðgengi fyrir raunverulegan sýnileika og mælanlegan árangur.
          Engin prufa, engin óvissa.
        </p>

        <div className="rounded-lg border p-3 mt-2">
          <p className="text-sm font-semibold">{BILLING_COPY.noteTitle}</p>
          <p className="text-sm text-muted-foreground">
            {BILLING_COPY.noteBody}
          </p>
        </div>
      </Card>

      <section className="grid gap-3 sm:grid-cols-3">
        {PLANS.map((p) => {
          const mailto = `mailto:${contactEmail}?subject=${subject}&body=${baseBody(
            p.title,
          )}`;

          return (
            <Card
              key={p.key}
              className={`p-5 space-y-3 ${p.highlight ? "border-primary" : ""}`}
            >
              <div className="space-y-1">
                <h2 className="text-lg font-bold">{p.title}</h2>
                <p className="text-sm text-muted-foreground">{p.price}</p>
              </div>

              <ul className="text-sm space-y-1 list-disc pl-5">
                {p.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>

              <div className="pt-2 space-y-2">
                <Button asChild className="w-full">
                  <a href={mailto}>Virkja {p.title}</a>
                </Button>
                <p className="text-xs text-muted-foreground">
                  Aðgangur er virkjaður eftir staðfestingu.
                </p>
              </div>
            </Card>
          );
        })}
      </section>

      <div className="pt-2">
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← Til baka
        </Link>
      </div>
    </main>
  );
}
