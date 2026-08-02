import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { documentMask } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Clientes" };

/** Índice da carteira: uma leitura por cliente, todas no mesmo painel de vidro. */
export default async function ClientsPage() {
  const clients = await bff.clients();

  return (
    <div>
      <PageHeader
        title="Clientes"
        note="CPF e CNPJ são validados por dígito verificador no core; documento duplicado morre com 409 antes de virar linha aqui."
        readout={
          <ReadoutStrip>
            <Readout label="Na carteira" value={clients.length} />
          </ReadoutStrip>
        }
      />

      {clients.length === 0 ? (
        <div className="glass rounded-xl px-6 py-16 text-center">
          <p className="text-2xl font-semibold tracking-[-0.01em]">Carteira vazia</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">
            Cadastre pelo BFF:{" "}
            <code className="readout rounded bg-black/35 px-1.5 py-0.5 text-xs">
              POST /bff/clients
            </code>
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
