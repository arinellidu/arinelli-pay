"use client";

import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Falha de rota: nomeia o que quebrou e devolve o caminho de volta. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="surface-panel surface-frame surface-scan rounded-xl px-6 py-16 text-center">
      <p className="text-2xl font-semibold tracking-[-0.01em] text-alert">
        Falha de comunicação
      </p>
      <p className="mx-auto mt-3 max-w-[54ch] text-sm leading-relaxed text-read-soft">
        A tela não conseguiu consultar o BFF. A stack local precisa estar inteira
        de pé: compose (Postgres e Redis), billing-core, payments-core, gateway
        e BFF.
      </p>
      {error.message ? (
        <code className="readout mx-auto mt-4 block max-w-[60ch] rounded-md border border-white/8 bg-black/35 p-2.5 text-[11px] break-all text-read-faint">
          {error.message}
        </code>
      ) : null}
      <Button variant="glass" className="mt-6 h-9" onClick={reset}>
        <RotateCw data-icon="inline-start" />
        Tentar de novo
      </Button>
    </div>
  );
}
