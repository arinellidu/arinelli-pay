import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { documentMask } from "@/lib/format";
import { ClientForm, type ClientCandidate } from "@/components/client-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Clientes" };

export default async function ClientsPage() {
  const [clients, pessoasFisicas, pessoasJuridicas] = await Promise.all([bff.clients(), bff.pessoasFisicas(), bff.pessoasJuridicas()]);
  const documentsInPortfolio = new Set(clients.map((client) => client.document));
  const candidates: ClientCandidate[] = [
    ...pessoasFisicas.map((pessoa) => ({ key: `pf-${pessoa.id}`, document: pessoa.cpf, documentType: "CPF" as const, name: pessoa.nome, email: pessoa.email })),
    ...pessoasJuridicas.map((pessoa) => ({ key: `pj-${pessoa.id}`, document: pessoa.cnpj, documentType: "CNPJ" as const, name: pessoa.nomeFantasia || pessoa.razaoSocial, email: pessoa.emailContato })),
  ].filter((candidate) => !documentsInPortfolio.has(candidate.document));

  return (
    <div>
      <PageHeader
        title="Clientes"
        note="Carteira operacional formada por CPFs e CNPJs já cadastrados. Cada documento entra uma única vez e pode concentrar múltiplos contratos."
        readout={<ReadoutStrip><Readout label="Na carteira" value={clients.length} /><Readout label="Disponíveis" value={candidates.length} tone={candidates.length > 0 ? "signal" : "read"} /></ReadoutStrip>}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-read-faint">Documento, identidade e contato em um único registro.</p>
        <ClientForm candidates={candidates} />
      </div>

      {clients.length === 0 ? (
        <div className="glass rounded-xl px-6 py-16 text-center"><p className="text-2xl font-semibold tracking-[-0.02em]">Carteira vazia</p><p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">Cadastre uma pessoa física ou jurídica e promova o documento a cliente.</p></div>
      ) : (
        <div className="glass overflow-hidden rounded-xl">
          <div className="hidden grid-cols-[5rem_minmax(13rem,1fr)_minmax(11rem,.7fr)_minmax(12rem,.9fr)_2rem] gap-4 border-b border-white/12 bg-white/4 px-4 py-3 text-[9px] font-semibold tracking-[0.17em] text-read-faint uppercase md:grid">
            <span>Natureza</span><span>Cliente</span><span>Documento</span><span>Contato</span><span />
          </div>
          <ul>
            {clients.map((client) => (
              <li key={client.id} className="border-b border-white/7 last:border-b-0">
                <Link href={`/clients/${client.id}`} className="group grid gap-2 px-4 py-4 transition-colors hover:bg-white/5 md:grid-cols-[5rem_minmax(13rem,1fr)_minmax(11rem,.7fr)_minmax(12rem,.9fr)_2rem] md:items-center md:gap-4">
                  <Badge variant="outline" className="border-white/12 text-read-soft">{client.documentType}</Badge>
                  <span className="min-w-0"><span className="block truncate font-medium tracking-[-0.01em] group-hover:text-signal">{client.name}</span><span className="readout mt-1 block text-[10px] text-read-faint">CLI-{String(client.id).padStart(4, "0")}</span></span>
                  <span className="readout text-xs text-read-soft">{documentMask(client.document)}</span>
                  <span className="truncate text-xs text-read-soft">{client.email || "Sem e-mail informado"}</span>
                  <ArrowUpRight className="hidden size-4 text-read-faint group-hover:text-signal md:block" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
