import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { documentMask } from "@/lib/format";
import { ClientForm, type ClientCandidate } from "@/components/client-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

/** Índice da carteira: uma leitura por cliente, todas no mesmo painel de vidro. */
export default async function ClientsPage() {
  const [clients, pessoasFisicas, pessoasJuridicas] = await Promise.all([
    bff.clients(),
    bff.pessoasFisicas(),
    bff.pessoasJuridicas(),
  ]);
  const documentsInPortfolio = new Set(clients.map((client) => client.document));
  const candidates: ClientCandidate[] = [
    ...pessoasFisicas.map((pessoa) => ({
      key: `pf-${pessoa.id}`,
      document: pessoa.cpf,
      documentType: "CPF" as const,
      name: pessoa.nome,
      email: pessoa.email,
    })),
    ...pessoasJuridicas.map((pessoa) => ({
      key: `pj-${pessoa.id}`,
      document: pessoa.cnpj,
      documentType: "CNPJ" as const,
      name: pessoa.nomeFantasia || pessoa.razaoSocial,
      email: pessoa.emailContato,
    })),
  ].filter((candidate) => !documentsInPortfolio.has(candidate.document));

  return (
    <div>
      <PageHeader
        title="Clientes"
        note="Clientes nascem de pessoas físicas e jurídicas já cadastradas. Cada CPF ou CNPJ entra uma única vez na carteira e pode concentrar vários contratos."
        readout={
          <ReadoutStrip>
            <Readout label="Na carteira" value={clients.length} />
          </ReadoutStrip>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {candidates.length === 0 && pessoasFisicas.length + pessoasJuridicas.length > 0 ? (
          <span className="text-xs text-read-faint">
            Todos os documentos cadastrados já estão na carteira.
          </span>
        ) : null}
        <ClientForm candidates={candidates} />
      </div>

      {clients.length === 0 ? (
        <div className="glass rounded-xl px-6 py-16 text-center">
          <p className="text-2xl font-semibold tracking-[-0.01em]">Carteira vazia</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">
            Cadastre primeiro uma pessoa física ou jurídica e use “Novo cliente” para adicioná-la.
          </p>
        </div>
      ) : (
        <ul className="glass overflow-hidden rounded-xl">
          {clients.map((client) => (
            <li key={client.id} className="border-b border-white/6 last:border-b-0">
              <Link
                href={`/clients/${client.id}`}
                className="group flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-4 hover:bg-white/5"
              >
                <span className="min-w-0 text-lg font-medium tracking-[-0.01em] group-hover:text-signal">
                  {client.name}
                </span>
                <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-read-soft">
                  <Badge variant="outline" className="border-white/12 text-read-soft">
                    {client.documentType}
                  </Badge>
                  <span className="readout text-xs">{documentMask(client.document)}</span>
                  {client.email ? (
                    <span className="hidden text-xs sm:inline">{client.email}</span>
                  ) : null}
                  <ChevronRight
                    className="size-4 text-read-faint group-hover:text-signal"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
