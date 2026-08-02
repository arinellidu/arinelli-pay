import Link from "next/link";
import type { BffInvoice } from "@/lib/bff";
import { dateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "./money";
import { PixChargeButton } from "./pix-charge";
import { ChargeState, InvoiceStatus, RailBadge } from "./status-badge";

/**
 * Painel de fatura sob vidro de cobertura: a leitura do valor domina, o estado
 * é etiqueta, e o painel ganha aresta de fósforo enquanto a cobrança está viva.
 */
export function InvoiceCards({ invoices }: { invoices: BffInvoice[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {invoices.map((invoice) => {
        const live = invoice.charge?.status === "PENDING" && invoice.status !== "PAID";
        return (
          <article
            key={invoice.id}
            className={cn(
              "glass flex flex-col rounded-xl",
              live && "edge-signal border-signal/25",
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
              <span className="readout text-[11px] tracking-[0.16em] text-read-faint uppercase">
                Fatura {String(invoice.id).padStart(4, "0")}
              </span>
              <InvoiceStatus status={invoice.status} />
            </div>

            <div className="flex flex-1 flex-col px-4 py-4">
              <p className="line-clamp-1 text-sm font-medium">{invoice.contract.title}</p>
              <Link
                href={`/clients/${invoice.client.id}`}
                className="mt-0.5 line-clamp-1 w-fit text-sm text-read-soft underline decoration-white/20 underline-offset-4 hover:text-signal hover:decoration-signal/50"
              >
                {invoice.client.name}
              </Link>

              <Money
                value={invoice.amount}
                className="mt-5 text-[2rem] leading-none font-medium"
              />

              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-read-faint">
                <span className="readout">
                  Vence {dateShort(invoice.dueDate)}
                  {invoice.paidAt ? ` · paga ${dateShort(invoice.paidAt)}` : ""}
                </span>
                {invoice.charge ? <RailBadge rail={invoice.charge.rail} /> : null}
              </div>
            </div>

            <div className="flex min-h-[3.25rem] items-center justify-between gap-3 border-t border-white/8 px-4 py-3">
              {invoice.charge ? <ChargeState status={invoice.charge.status} /> : <span />}
              <PixChargeButton
                invoiceId={invoice.id}
                invoiceStatus={invoice.status}
                amount={invoice.amount}
                clientName={invoice.client.name}
                existingCharge={invoice.charge}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
