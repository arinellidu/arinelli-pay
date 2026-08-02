import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { bff, generateNextInvoice, type Contract } from "@/lib/bff";
import { SubmitButton } from "@/components/submit-button";
import { ViewToggle } from "@/components/view-toggle";
import { dateShort, documentMask, money } from "@/lib/format";

export const dynamic = "force-dynamic";

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
  const contracts = await bff.contractsOf(id);

  async function generate(formData: FormData) {
    "use server";
    const contractId = Number(formData.get("contractId"));
    await generateNextInvoice(contractId);
    revalidatePath(`/clients/${id}`);
    revalidatePath("/invoices");
  }

  return (
    <div>
      <div className="mb-8">
        <Link href="/clients" className="text-xs text-ink-soft underline decoration-dotted">
          ← clientes
        </Link>
        <h1 className="bitmap mt-1 text-step-64 leading-none">{client.name}</h1>
        <div className="mt-2 flex flex-wrap items-baseline gap-4 text-sm text-ink-soft">
          <span className="border border-ink px-1.5 py-0.5 text-[10px] font-bold tracking-[0.18em]">
            {client.documentType}
          </span>
          <span className="font-mono">{documentMask(client.document)}</span>
          {client.email ? <span>{client.email}</span> : null}
          <span>desde {dateShort(client.createdAt)}</span>
        </div>
        <div className="rule-dotted mt-4" />
      </div>

      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="bitmap text-step-32">CONTRATOS</h2>
        <div className="flex items-center gap-3">
          <Link
            href={`/invoices?clientId=${client.id}`}
            className="text-xs underline decoration-dotted hover:bg-synth"
          >
            ver faturas deste cliente →
          </Link>
          <ViewToggle
            view={view}
            makeHref={(v) => `/clients/${client.id}?view=${v}`}
          />
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 px-6 py-10 text-center">
          <p className="bitmap text-step-24 text-ink-soft">SEM CONTRATOS</p>
          <p className="mt-1 text-sm text-ink-soft">
            Crie via API: <code className="font-mono">POST /bff/contracts</code>
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
      <SubmitButton label="GERAR PRÓXIMA FATURA" pendingLabel="GERANDO…" />
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {contracts.map((contract) => (
        <article key={contract.id} className="border-2 border-ink">
          <div className="flex items-start justify-between border-b border-ink/30 px-3 py-2">
            <p className="text-sm font-bold">{contract.title}</p>
            <span
              className={`stamp text-[13px] ${
                contract.status === "ACTIVE" ? "text-ink" : "text-ink-soft/60"
              }`}
            >
              {contract.status === "ACTIVE" ? "ATIVO" : "ENCERRADO"}
            </span>
          </div>
          <div className="px-3 py-3">
            <p className="bitmap text-step-48 leading-none">{money(contract.amount)}</p>
            <p className="rule-dotted mt-2 pb-1 text-xs text-ink-soft">
              todo dia {contract.billingDay}
              {contract.nextDueDate ? ` · próximo vencimento ${dateShort(contract.nextDueDate)}` : ""}
            </p>
          </div>
          <div className="flex justify-end px-3 pb-3">
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
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-4 border-ink text-left text-[11px] font-bold uppercase tracking-[0.18em]">
            <th className="px-2 py-2">Nº</th>
            <th className="px-2 py-2">Título</th>
            <th className="px-2 py-2">Valor</th>
            <th className="px-2 py-2">Dia</th>
            <th className="px-2 py-2">Próx. vencimento</th>
            <th className="px-2 py-2">Status</th>
            <th className="px-2 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract) => (
            <tr key={contract.id} className="rule-dotted align-middle hover:bg-paper-deep">
              <td className="px-2 py-2.5 font-mono text-xs">
                {String(contract.id).padStart(4, "0")}
              </td>
              <td className="px-2 py-2.5">{contract.title}</td>
              <td className="px-2 py-2.5 text-right font-mono">{money(contract.amount)}</td>
              <td className="px-2 py-2.5">{contract.billingDay}</td>
              <td className="px-2 py-2.5">
                {contract.nextDueDate ? dateShort(contract.nextDueDate) : "—"}
              </td>
              <td className="px-2 py-2.5">
                {contract.status === "ACTIVE" ? "ativo" : "encerrado"}
              </td>
              <td className="px-2 py-2.5">
                <GenerateButton contract={contract} generate={generate} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
