import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { ContractForm } from "@/components/contract-form";
import { ContractStatus } from "@/components/status-badge";
import { Money } from "@/components/money";
import { dateShort, documentMask, money } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Contratos" };

export default async function ContractsPage() {
  const [contracts, clients] = await Promise.all([bff.contracts(), bff.clients()]);
  const active = contracts.filter((contract) => contract.status === "ACTIVE");
  const monthlyAmount = active.reduce((total, contract) => total + Number(contract.amount), 0);

  return (
    <div>
      <PageHeader
        title="Contratos"
        note="Cada contrato pertence a um cliente da carteira e define uma cobrança recorrente. O próximo vencimento avança quando uma nova fatura é gerada."
        readout={
          <ReadoutStrip>
            <Readout label="Ativos" value={active.length} tone="signal" />
            <Readout label="Mensal" value={money(monthlyAmount)} />
          </ReadoutStrip>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {clients.length === 0 ? (
          <Link href="/clients" className="text-xs text-read-soft underline decoration-white/20 underline-offset-4 hover:text-signal">
            Cadastre um cliente antes de criar contratos
          </Link>
        ) : null}
        <ContractForm clients={clients} />
      </div>

      {contracts.length === 0 ? (
        <div className="glass rounded-xl px-6 py-16 text-center">
          <p className="text-2xl font-semibold tracking-[-0.01em]">Nenhum contrato</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">
            Um contrato define o valor, o vencimento e o cliente responsável pelas próximas faturas.
          </p>
        </div>
      ) : (
        <ul className="glass overflow-hidden rounded-xl">
          {contracts.map((contract) => (
            <li key={contract.id} className="border-b border-white/6 last:border-b-0">
              <Link
                href={`/contracts/${contract.id}`}
                className="group grid gap-3 px-4 py-4 hover:bg-white/5 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="truncate text-lg font-medium tracking-[-0.01em] group-hover:text-signal">
                      {contract.title}
                    </p>
                    <ContractStatus status={contract.status} />
                  </div>
                  <p className="mt-1 truncate text-xs text-read-soft">
                    {contract.clientName} · {documentMask(contract.clientDocument)}
                  </p>
                </div>
                <div className="sm:text-right">
                  <Money value={contract.amount} className="text-base" />
                  <p className="readout mt-1 text-[11px] text-read-faint">
                    {contract.nextDueDate
                      ? `Vence ${dateShort(contract.nextDueDate)}`
                      : `Dia ${contract.billingDay}`}
                  </p>
                </div>
                <ChevronRight className="hidden size-4 text-read-faint group-hover:text-signal sm:block" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
