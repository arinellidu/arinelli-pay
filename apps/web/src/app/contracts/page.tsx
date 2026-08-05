import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
        note="Registro de recorrências vinculado à carteira. Cada contrato parte de um cliente cadastrado e governa valor, vencimento e geração de faturas."
        readout={<ReadoutStrip><Readout label="Ativos" value={active.length} tone="signal" /><Readout label="Receita mensal" value={money(monthlyAmount)} /></ReadoutStrip>}
      />

      <div className="mb-4 flex items-center justify-between lg:hidden">
        <p className="text-xs text-read-soft">{contracts.length} registro{contracts.length === 1 ? "" : "s"}</p>
        <ContractForm clients={clients} />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section aria-label="Registro de contratos">
          {contracts.length === 0 ? (
            <div className="surface-panel surface-frame surface-scan rounded-xl px-6 py-16 text-center">
              <p className="text-2xl font-semibold tracking-[-0.02em]">Nenhum contrato</p>
              <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">Use o cadastro ao lado para associar o primeiro cliente e definir sua recorrência.</p>
            </div>
          ) : (
            <div className="surface-panel surface-frame surface-scan overflow-hidden rounded-xl">
              <div className="hidden grid-cols-[4rem_minmax(12rem,1fr)_minmax(10rem,.8fr)_8rem_7rem_2rem] gap-4 border-b border-white/12 bg-black/30 px-4 py-3 text-[9px] font-semibold tracking-[0.17em] text-read-faint uppercase shadow-[inset_0_1px_0_rgb(255_255_255/6%)] md:grid">
                <span>Registro</span><span>Contrato / cliente</span><span>Documento</span><span className="text-right">Recorrência</span><span>Status</span><span />
              </div>
              <ul>
                {contracts.map((contract) => (
                  <li key={contract.id} className="border-b border-white/7 last:border-b-0">
                    <Link href={`/contracts/${contract.id}`} className="group grid gap-3 px-4 py-4 transition-colors hover:bg-white/5 md:grid-cols-[4rem_minmax(12rem,1fr)_minmax(10rem,.8fr)_8rem_7rem_2rem] md:items-center md:gap-4">
                      <span className="readout text-[11px] text-read-faint">CTR-{String(contract.id).padStart(4, "0")}</span>
                      <span className="min-w-0"><span className="block truncate font-medium tracking-[-0.01em] group-hover:text-signal">{contract.title}</span><span className="mt-1 block truncate text-xs text-read-soft">{contract.clientName}</span></span>
                      <span className="readout text-xs text-read-soft">{documentMask(contract.clientDocument)}</span>
                      <span className="md:text-right"><Money value={contract.amount} className="text-sm" /><span className="readout mt-1 block text-[10px] text-read-faint">{contract.nextDueDate ? dateShort(contract.nextDueDate) : `dia ${contract.billingDay}`}</span></span>
                      <ContractStatus status={contract.status} />
                      <ArrowUpRight className="hidden size-4 text-read-faint transition-colors group-hover:text-signal md:block" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {clients.length === 0 ? <Link href="/clients" className="mt-4 inline-block text-xs text-signal underline underline-offset-4">Cadastre um cliente antes de criar contratos</Link> : null}
        </section>
        <div className="hidden lg:block"><ContractForm clients={clients} presentation="panel" /></div>
      </div>
    </div>
  );
}
