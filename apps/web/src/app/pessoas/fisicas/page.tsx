import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { PessoaFisicaForm } from "@/components/people/pessoa-fisica-form";
import { documentMask } from "@/lib/format";
import { maskTelefone } from "@/lib/masks";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pessoas Físicas" };

/**
 * Cadastro de pessoa física persistido no billing-core (Postgres via Flyway).
 * Form valida com zod, o BFF revalida com o MESMO schema e o core reconfere
 * dígito verificador + unique — 409 volta apontando o campo.
 */
export default async function PessoasFisicasPage() {
  const pessoas = await bff.pessoasFisicas();

  return (
    <div>
      <PageHeader
        title="Pessoas Físicas"
        note="Cadastro persistido no billing-core (Postgres, schema por Flyway). Formulário e servidor validam com o mesmo schema zod — dígito verificador de CPF incluído — e o unique do banco decide o duplicado."
        readout={
          <ReadoutStrip>
            <Readout label="Cadastradas" value={pessoas.length} />
          </ReadoutStrip>
        }
      />

      <div className="mb-4 flex justify-end">
        <PessoaFisicaForm />
      </div>

      {pessoas.length === 0 ? (
        <div className="glass rounded-xl px-6 py-16 text-center">
          <p className="text-2xl font-semibold tracking-[-0.01em]">Nenhuma pessoa física</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">
            Cadastre a primeira — só nome e CPF são obrigatórios; o resto pode vir depois.
          </p>
        </div>
      ) : (
        <ul className="glass overflow-hidden rounded-xl">
          {pessoas.map((pessoa) => (
            <li key={pessoa.id} className="border-b border-white/6 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-lg font-medium tracking-[-0.01em]">{pessoa.nome}</p>
                  <p className="readout mt-0.5 text-xs text-read-soft">
                    {documentMask(pessoa.cpf)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-read-soft">
                  {pessoa.email ? <span>{pessoa.email}</span> : null}
                  {pessoa.telefone ? (
                    <span className="readout">{maskTelefone(pessoa.telefone)}</span>
                  ) : null}
                  {pessoa.cidade ? (
                    <span>
                      {pessoa.cidade}
                      {pessoa.uf ? ` · ${pessoa.uf}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
