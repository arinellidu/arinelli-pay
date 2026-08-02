import Link from "next/link";
import { bff } from "@/lib/bff";
import { SpecimenHeader } from "@/components/specimen-header";
import { documentMask } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Índice de clientes como página de specimen: cada nome é uma amostra. */
export default async function ClientsPage() {
  const clients = await bff.clients();

  return (
    <div>
      <SpecimenHeader
        word="CLIENTES"
        note="CPF ou CNPJ validado por dígito verificador no core — duplicado morre com 409 antes de virar linha aqui."
      />

      {clients.length === 0 ? (
        <div className="border-2 border-dashed border-ink/40 px-6 py-14 text-center">
          <p className="bitmap text-step-32 text-ink-soft">SEM CLIENTES</p>
          <p className="mt-2 text-sm text-ink-soft">
            Cadastre via API: <code className="font-mono">POST /bff/clients</code>
          </p>
        </div>
      ) : (
        <ul>
          {clients.map((client) => (
            <li key={client.id} className="rule-dotted">
              <Link
                href={`/clients/${client.id}`}
                className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-4 hover:bg-paper-deep"
              >
                <span className="bitmap text-step-32 leading-none group-hover:bg-synth">
                  {client.name}
                </span>
                <span className="flex items-baseline gap-4 text-sm text-ink-soft">
                  <span className="border border-ink px-1.5 py-0.5 text-[10px] font-bold tracking-[0.18em]">
                    {client.documentType}
                  </span>
                  <span className="font-mono">{documentMask(client.document)}</span>
                  {client.email ? <span>{client.email}</span> : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
