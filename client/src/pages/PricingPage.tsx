// client/src/pages/PricingPage.tsx
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const FEATURES = [
  "Ótakmarkaður fjöldi auglýsinga",
  "Fullt aðgengi að öllum eiginleikum",
  "Logo og upplýsingar verslunar",
  "Verslunarsíða sýnileg notendum",
  "Hægt að hætta hvenær sem er",
];

export default function PricingPage() {
  const contactEmail = "hello@utsalapp.is";
  const subject = encodeURIComponent("Áskrift – ÚtsalApp");
  const body = encodeURIComponent(
    `Sæl/sæll,\n\nÉg vil virkja áskrift að ÚtsalApp.\nVerslun: \nKennitala (ef við á): \nSími: \n\nTakk!\n`,
  );
  const mailto = `mailto:${contactEmail}?subject=${subject}&body=${body}`;

  return (
    <main className="space-y-6">
      <Card className="p-5 space-y-2">
        <h1 className="text-xl font-bold">Verðskrá</h1>
        <p className="text-sm text-muted-foreground">
          Eitt einfalt verð. Engin leyndarmál. Hætt hvenær sem er.
        </p>
      </Card>

      <Card className="p-6 space-y-5 border-primary border-2">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold">Ótakmarkaðar auglýsingar</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Allt innifalið í einum pakka
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">59.900 kr</p>
            <p className="text-xs text-muted-foreground">+ VSK á mánuði</p>
          </div>
        </div>

        <ul className="space-y-2">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="pt-1 space-y-2">
          <Button asChild className="w-full">
            <a href={mailto}>Hefja 7 daga frí prufuviku</a>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            7 daga frí prufuvika — engin greiðsluupplýsingar þarf núna.
          </p>
        </div>
      </Card>

      <div className="pt-2">
        <Link to="/" className="text-sm text-muted-foreground underline">
          ← Til baka
        </Link>
      </div>
    </main>
  );
}
