import { chargeStatusLabel, invoiceStatusLabel } from "@/lib/format";

const invoiceStyle: Record<string, string> = {
  PAID: "text-stamp-paid",
  OPEN: "text-ink",
  OVERDUE: "text-alarm",
  CANCELED: "text-ink-soft",
  DRAFT: "text-ink-soft",
};

export function InvoiceStamp({
  status,
  size = "text-step-16",
  animate = false,
}: {
  status: string;
  size?: string;
  animate?: boolean;
}) {
  return (
    <span
      className={`stamp ${size} ${invoiceStyle[status] ?? "text-ink"} ${animate ? "stamp-in" : ""}`}
    >
      {invoiceStatusLabel[status] ?? status}
    </span>
  );
}

export function RailChip({ rail }: { rail: string }) {
  return (
    <span className="border border-ink px-1.5 py-0.5 text-[10px] font-medium tracking-[0.18em]">
      {rail}
    </span>
  );
}

export function ChargeChip({ status }: { status: string }) {
  const live = status === "PENDING";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-ink-soft">
      {live ? <span className="blink-block inline-block h-2.5 w-2.5 bg-synth-deep" aria-hidden /> : null}
      COBRANÇA {chargeStatusLabel[status] ?? status}
    </span>
  );
}
