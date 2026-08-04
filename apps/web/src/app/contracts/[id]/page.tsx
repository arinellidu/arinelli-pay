import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { bff, generateNextInvoice } from "@/lib/bff";
import { Money } from "@/components/money";
import { SubmitButton } from "@/components/submit-button";
import { ContractStatus } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { dateShort, documentMask } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await bff.contract(id).catch(() => null);
  return { title: contract?.title ?? "Contrato" };
}

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contract = await bff.contract(id).catch(() => null);
  if (!contract) notFound();
  const contractId = contract.id;
  const clientId = contract.clientId;

  async function generate() {
    "use server";
    await generateNextInvoice(contractId);
    revalidatePath(`/contracts/${contractId}`);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/contracts");
    revalidatePath("/invoices");
  }

  return (
    <div>
      <header className="mb-8">
        <Link href="/contracts" className="inline-flex items-center gap-1.5 text-xs text-read-faint hover:text-read">
          <ArrowLeft className="size-3.5" aria-hidden />
          Contratos
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[clamp(2rem,5.5vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.025em]">
              {contract.title}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-read-soft">
              <ContractStatus status={contract.status} />
              <Badge variant="outline" className="border-white/12 text-read-soft">
                {contract.clientDocumentType}
              </Badge>
              <span className="readout text-xs">{documentMask(contract.clientDocument)}</span>
              <span className="text-xs text-read-faint">Criado em {dateShort(contract.createdAt)}</span>
            </div>
          </div>
          {contract.status === "ACTIVE" ? (
            <form action={generate}>
              <SubmitButton label="Gerar próxima fatura" pendingLabel="Gerando…" />
            </form>
          ) : null}
        </div>
        <div className="hairline mt-6" />
      </header>

      <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
        <section className="glass rounded-xl px-5 py-5">
          <p className="readout text-[10px] tracking-[0.2em] text-read-faint uppercase">Valor recorrente</p>
          <Money value={contract.amount} className="mt-3 block text-[clamp(2.5rem,7vw,4rem)] leading-none font-medium" />
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/8 pt-4">
            <div>
              <p className="text-xs text-read-faint">Dia de cobrança</p>
              <p className="readout mt-1 text-lg">{contract.billingDay}</p>
            </div>
            <div>
              <p className="text-xs text-read-faint">Próximo vencimento</p>
              <p className="readout mt-1 text-lg">
                {contract.nextDueDate ? dateShort(contract.nextDueDate) : "A gerar"}
              </p>
            </div>
          </div>
        </section>

        <section className="glass flex flex-col justify-between rounded-xl px-5 py-5">
          <div>
            <p className="readout text-[10px] tracking-[0.2em] text-read-faint uppercase">Cliente</p>
            <Link href={`/clients/${contract.clientId}`} className="mt-3 block text-xl font-semibold hover:text-signal">
              {contract.clientName}
            </Link>
            <p className="readout mt-2 text-xs text-read-soft">{documentMask(contract.clientDocument)}</p>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-4">
            <Link href={`/clients/${contract.clientId}`} className="inline-flex items-center gap-1.5 text-xs text-read-soft hover:text-signal">
              Ver cliente <ArrowRight className="size-3.5" aria-hidden />
            </Link>
            <Link href={`/invoices?clientId=${contract.clientId}`} className="inline-flex items-center gap-1.5 text-xs text-read-soft hover:text-signal">
              Ver faturas <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
