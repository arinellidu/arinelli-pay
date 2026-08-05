import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { bff, generateNextInvoice, type Contract } from "@/lib/bff";
import { Money } from "@/components/money";
import { ContractStatus } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { ViewToggle } from "@/components/view-toggle";
import { Badge } from "@/components/ui/badge";
import { dateShort, documentMask } from "@/lib/format";
import { ContractForm } from "@/components/contract-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await bff.client(id).catch(() => null);
  return { title: client?.name ?? "Cliente" };
}

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { id } = await params;
  const { view: viewParam } = await searchParams;
  const view = viewParam === "table" ? "table" : "cards";

  const client = await bff.client(id).catch(() => null);
  if (!client) notFound();
  const [contracts, clients] = await Promise.all([bff.contractsOf(id), bff.clients()]);

  async function generate(formData: FormData) {
    "use server";
    const contractId = Number(formData.get("contractId"));
    await generateNextInvoice(contractId);
    revalidatePath(`/clients/${id}`);
    revalidatePath("/invoices");
  }

  return (
    <div>
      <header className="surface-toolbar surface-frame surface-scan mb-10 rounded-xl px-5 py-6">
        <Link
          href="/clients"
          className="relative z-1 inline-flex items-center gap-1.5 text-xs text-read-faint hover:text-signal-bright"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          Clientes
        </Link>
        <h1 className="title-shine relative z-1 mt-3 text-[clamp(2rem,5.5vw,3.25rem)] leading-[1.02] font-semibold tracking-[-0.025em]">
          {client.name}
        </h1>
        <div className="relative z-1 mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-read-soft">
          <Badge variant="outline" className="border-white/12 text-read-soft">
            {client.documentType}
          </Badge>
          <span className="readout text-xs">{documentMask(client.document)}</span>
          {client.email ? <span className="text-xs">{client.email}</span> : null}
          <span className="text-xs text-read-faint">
            Na carteira desde {dateShort(client.createdAt)}
          </span>
        </div>
      </header>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-[-0.01em]">Contratos</h2>
        <div className="flex flex-wrap items-center gap-4">
          <ContractForm clients={clients} initialClientId={client.id} />
          <Link
            href={`/invoices?clientId=${client.id}`}
            className="inline-flex items-center gap-1.5 text-xs text-read-soft underline decoration-white/20 underline-offset-4 hover:text-signal hover:decoration-signal/50"
          >
            Faturas deste cliente
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
          <ViewToggle view={view} makeHref={(v) => `/clients/${client.id}?view=${v}`} />
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="surface-panel surface-frame surface-scan rounded-xl px-6 py-14 text-center">
          <p className="text-xl font-semibold tracking-[-0.01em]">Sem contratos</p>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-read-soft">
            Use “Novo contrato” para definir a primeira cobrança recorrente deste cliente.
          </p>
        </div>
      ) : view === "table" ? (
        <ContractsTable contracts={contracts} generate={generate} />
      ) : (
        <ContractsCards contracts={contracts} generate={generate} />
      )}
    </div>
  );
}

function GenerateButton({
  contract,
  generate,
}: {
  contract: Contract;
  generate: (formData: FormData) => Promise<void>;
}) {
  if (contract.status !== "ACTIVE") return null;
  return (
    <form action={generate}>
      <input type="hidden" name="contractId" value={contract.id} />
      <SubmitButton label="Gerar próxima fatura" pendingLabel="Gerando…" />
    </form>
  );
}

function ContractsCards({
  contracts,
  generate,
}: {
  contracts: Contract[];
  generate: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {contracts.map((contract) => (
        <article key={contract.id} className="surface-panel surface-frame surface-scan card-panel flex flex-col rounded-xl">
          <div className="card-panel-well relative z-1 flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3">
            <Link
              href={`/contracts/${contract.id}`}
              className="line-clamp-1 text-sm font-medium hover:text-signal-bright"
            >
              {contract.title}
            </Link>
            <ContractStatus status={contract.status} />
          </div>
          <div className="relative z-1 flex-1 px-4 py-4">
            <Money
              value={contract.amount}
              className="text-[2rem] leading-none font-medium tracking-[-0.02em]"
            />
            <p className="readout mt-3 text-xs text-read-faint">
              Todo dia {contract.billingDay}
              {contract.nextDueDate
                ? ` · próximo vencimento ${dateShort(contract.nextDueDate)}`
                : ""}
            </p>
          </div>
          <div className="card-panel-well relative z-1 flex min-h-13 items-center justify-end border-t border-white/6 px-4 py-3">
            <GenerateButton contract={contract} generate={generate} />
          </div>
        </article>
      ))}
    </div>
  );
}

function ContractsTable({
  contracts,
  generate,
}: {
  contracts: Contract[];
  generate: (formData: FormData) => Promise<void>;
}) {
  const head =
    "readout px-3 py-2.5 text-[10px] tracking-[0.18em] text-read-faint uppercase";
  return (
    <div className="surface-panel surface-frame surface-scan overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="surface-well border-b border-white/12 text-left">
              <th scope="col" className={head}>
                Nº
              </th>
              <th scope="col" className={head}>
                Título
              </th>
              <th scope="col" className={`${head} text-right`}>
                Valor
              </th>
              <th scope="col" className={head}>
                Dia
              </th>
              <th scope="col" className={head}>
                Próx. vencimento
              </th>
              <th scope="col" className={head}>
                Status
              </th>
              <th scope="col" className={head}>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((contract) => (
              <tr
                key={contract.id}
                className="border-b border-white/6 align-middle last:border-b-0 hover:bg-white/4"
              >
                <td className="readout px-3 py-3 text-xs text-read-faint">
                  {String(contract.id).padStart(4, "0")}
                </td>
                <td className="px-3 py-3">
                  <Link href={`/contracts/${contract.id}`} className="hover:text-signal">
                    {contract.title}
                  </Link>
                </td>
                <td className="px-3 py-3 text-right">
                  <Money value={contract.amount} className="text-sm" />
                </td>
                <td className="readout px-3 py-3 text-xs text-read-soft">
                  {contract.billingDay}
                </td>
                <td className="readout px-3 py-3 text-xs text-read-soft">
                  {contract.nextDueDate ? (
                    dateShort(contract.nextDueDate)
                  ) : (
                    <span aria-label="sem próximo vencimento">—</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <ContractStatus status={contract.status} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex justify-end">
                    <GenerateButton contract={contract} generate={generate} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
