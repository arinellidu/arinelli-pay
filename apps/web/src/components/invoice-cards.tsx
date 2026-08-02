import Link from "next/link";
import type { BffInvoice } from "@/lib/bff";
import { dateShort, money } from "@/lib/format";
import { PixChargeButton } from "./pix-charge";
import { ChargeChip, InvoiceStamp, RailChip } from "./status-stamp";

/** Card specimen: o VALOR é o display bitmap; o resto é texto fino de catálogo. */
export function InvoiceCards({ invoices }: { invoices: BffInvoice[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {invoices.map((invoice) => (
        <article key={invoice.id} className="border-2 border-ink bg-paper">
          <div className="border-b border-ink/30 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold tracking-[0.16em] text-ink-soft uppercase">
                Fatura {String(invoice.id).padStart(4, "0")}
              </p>
              <InvoiceStamp status={invoice.status} />
            </div>
            <p className="mt-0.5 line-clamp-1 text-sm font-medium">{invoice.contract.title}</p>
            <Link
              href={`/clients/${invoice.client.id}`}
              className="text-sm text-ink-soft underline decoration-dotted underline-offset-2 hover:bg-synth hover:text-ink"
            >
              {invoice.client.name}
            </Link>
          </div>

          <div className="px-3 py-3">
            <p className="bitmap text-step-48 leading-none" aria-label={money(invoice.amount)}>
              {money(invoice.amount)}
            </p>
            <div className="rule-dotted mt-2 flex items-baseline justify-between pb-1 text-xs text-ink-soft">
              <span>
                vence {dateShort(invoice.dueDate)}
                {invoice.paidAt ? ` · paga ${dateShort(invoice.paidAt)}` : ""}
              </span>
              {invoice.charge ? <RailChip rail={invoice.charge.rail} /> : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 px-3 pb-3">
            {invoice.charge ? <ChargeChip status={invoice.charge.status} /> : <span />}
            <PixChargeButton
              invoiceId={invoice.id}
              invoiceStatus={invoice.status}
              existingCharge={invoice.charge}
            />
          </div>
        </article>
      ))}
    </div>
  );
}
