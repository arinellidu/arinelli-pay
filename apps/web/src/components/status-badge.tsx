import { Badge } from "@/components/ui/badge";
import { chargeStatusLabel, invoiceStatusLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type BadgeTone = "signal" | "alert" | "neutral" | "default";

const invoiceTone: Record<string, BadgeTone> = {
  PAID: "signal",
  OVERDUE: "alert",
  OPEN: "default",
  CANCELED: "neutral",
  DRAFT: "neutral",
};

/**
 * Estado da fatura como etiqueta de leitura. ABERTA usa a variante `default`
 * (leitura branca sobre vidro) para que o fósforo continue reservado ao que
 * realmente liquidou.
 */
export function InvoiceStatus({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = invoiceTone[status] ?? "neutral";
  return (
    <Badge
      variant={tone === "default" ? "outline" : tone}
      className={cn(tone === "default" && "border-white/18 text-read", className)}
    >
      {invoiceStatusLabel[status] ?? status}
    </Badge>
  );
}

export function RailBadge({ rail }: { rail: string }) {
  return (
    <Badge variant="outline" className="border-white/12 text-read-soft">
      {rail}
    </Badge>
  );
}

/**
 * Lâmpada de atividade do aparelho:
 * `live` respira enquanto o polling está de pé, `on` fica acesa e fixa quando
 * a cobrança liquidou, `off` é o piloto apagado.
 */
export function Lamp({ state }: { state: "live" | "on" | "off" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-[7px] shrink-0 rounded-full",
        state === "live" && "lamp bg-signal",
        state === "on" && "bg-signal shadow-[0_0_6px_0_var(--color-signal)]",
        state === "off" && "bg-white/25",
      )}
    />
  );
}

export function ChargeState({ status }: { status: string }) {
  const settled = status === "SETTLED";
  return (
    <span
      className={cn(
        "readout inline-flex items-center gap-2 text-[11px] tracking-[0.12em] uppercase",
        settled ? "text-signal" : "text-read-faint",
      )}
    >
      <Lamp state={status === "PENDING" ? "live" : settled ? "on" : "off"} />
      {chargeStatusLabel[status] ?? status}
    </span>
  );
}

export function ContractStatus({ status }: { status: string }) {
  return status === "ACTIVE" ? (
    <Badge variant="outline" className="border-white/18 text-read">
      Ativo
    </Badge>
  ) : (
    <Badge variant="neutral">Encerrado</Badge>
  );
}
