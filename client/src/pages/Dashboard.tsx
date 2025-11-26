// client/src/pages/Dashboard.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="min-h-screen pb-24">
      {/* Haus */}
      <header className="p-4 border-b border-border">
        <h1 className="text-2xl font-bold">Stjórnborð verslana</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Hér munu verslanir sjá yfirlit yfir útsölutilboð, búa til ný tilboð og
          stýra þeim sem þegar eru inni í ÚtsalApp.
        </p>
      </header>

      {/* Aðalefni */}
      <main className="p-4 max-w-3xl mx-auto space-y-4">
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold text-lg">Næstu skref</h2>
          <p className="text-sm text-muted-foreground">
            Við erum að klára uppsetningu á stjórnborðinu. Á næstu dögum munu
            verslanir geta:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            <li>Búið til ný útsölutilboð með myndum, verði og dagsetningum.</li>
            <li>Séð yfirlit yfir virkar útsölur og breytt þeim.</li>
            <li>Slökkt og kveikt á tilboðum eftir þörfum.</li>
          </ul>

          <div className="pt-3 border-t border-border mt-2 space-y-2">
            {/* Nota Link í stað <a href> svo React Router haldi utan um navigation */}
            <Link to="/create">
              <Button className="w-full">Búa til nýtt útsölutilboð</Button>
            </Link>

            <p className="text-[11px] text-muted-foreground text-center">
              Hér býrð þú til ný útsölutilboð fyrir verslunina þína.
            </p>
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <h2 className="font-semibold text-lg">Yfirlit (kemur fljótlega)</h2>
          <p className="text-sm text-muted-foreground">
            Hér mun síðar birtast listi yfir öll tilboð verslunarinnar með
            stöðu, dagsetningum og fjölda skoðana. Þetta er næsta skref í
            þróuninni.
          </p>
        </Card>
      </main>
    </div>
  );
}
