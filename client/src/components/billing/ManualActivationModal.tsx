// client/src/components/billing/ManualActivationModal.tsx
import * as React from "react";
import { Link } from "react-router-dom";

import { BILLING_COPY } from "@/lib/billingCopy";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  open: boolean;
  onClose: () => void;
  context?: string; // t.d. "Búa til tilboð", "Stillingar", o.s.frv.
  contactEmail?: string; // t.d. "hello@utsalapp.is" (settu þitt)
};

export function ManualActivationModal({
  open,
  onClose,
  context,
  contactEmail,
}: Props) {
  if (!open) return null;

  const subject = encodeURIComponent("Virkja aðgang – ÚtsalApp");
  const body = encodeURIComponent(
    `Sæl/sæll,\n\nÉg vil virkja aðgang að ÚtsalApp.\n` +
      (context ? `Tilgangur: ${context}\n` : "") +
      `\nPakkaval: (Basic / Pro / Premium)\nVerslun: \nKennitala (ef við á): \nSími: \n\nTakk!\n`,
  );

  const mailto = contactEmail
    ? `mailto:${contactEmail}?subject=${subject}&body=${body}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <Card className="w-full max-w-lg p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold">{BILLING_COPY.headline}</h2>
          <p className="text-sm text-muted-foreground">
            {BILLING_COPY.subheadline}
          </p>
        </div>

        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-sm font-semibold">{BILLING_COPY.noteTitle}</p>
          <p className="text-sm text-muted-foreground">
            {BILLING_COPY.noteBody}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild className="w-full">
            <Link to="/pricing" onClick={onClose}>
              {BILLING_COPY.primaryCta}
            </Link>
          </Button>

          {mailto ? (
            <Button
              variant="outline"
              className="w-full"
              asChild
              title="Opnar tölvupóst"
            >
              <a href={mailto} onClick={onClose}>
                {BILLING_COPY.secondaryCta}
              </a>
            </Button>
          ) : (
            <Button variant="outline" className="w-full" onClick={onClose}>
              {BILLING_COPY.secondaryCta}
            </Button>
          )}
        </div>

        <div className="pt-1">
          <button
            onClick={onClose}
            className="text-sm text-muted-foreground underline"
            type="button"
          >
            {BILLING_COPY.backCta}
          </button>
        </div>
      </Card>
    </div>
  );
}
