import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { PessoaJuridicaForm } from "@/components/people/pessoa-juridica-form";
import { documentMask } from "@/lib/format";
import { maskTelefone } from "@/lib/masks";

export const dynamic = "force-dynamic";

export const metadata = { title: "Pessoas Jurídicas" };

/**
 * Cadastro de pessoa jurídica persistido no billing-core: toda PJ nasce
 * atrelada a uma pessoa física já cadastrada — o responsável legal, FK
 * obrigatória no banco. O core revalida o vínculo (422 se a PF não existir).
 */
export default async function PessoasJuridicasPage() {
  const [empresas, fisicas] = await Promise.all([
    bff.pessoasJuridicas(),
    bff.pessoasFisicas(),
  ]);

  return (
    <div>
      <PageHeader
        title="Pessoas Jurídicas"
        note="Cadastro persistido no billing-core. CNPJ, nome da empresa, contato e responsável legal são obrigatórios — e o responsável precisa existir como pessoa física antes (FK no banco)."
        readout={
          <ReadoutStrip>
            <Readout label="Cadastradas" value={empresas.length} />
            <Readout label="Responsáveis" value={fisicas.length} />
          </ReadoutStrip>
        }
      />

      <div className="mb-4 flex justify-end">
        <PessoaJuridicaForm
          responsaveis={fisicas.map(({ id, nome, cpf }) => ({ id, nome, cpf }))}
        />
      </div>

      {empresas.length === 0 ? (
        <div className="glass rounded-xl px-6 py-16 text-center">
          <p className="text-2xl font-semibold tracking-[-0.01em]">
            Nenhuma pessoa jurídica
          </p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">
            Cadastre a primeira — ela precisa de uma pessoa física como responsável
            legal.
          </p>
        </div>
      ) : (
        <ul className="glass overflow-hidden rounded-xl">
          {empresas.map((empresa) => (
            <li key={empresa.id} className="border-b border-white/6 last:border-b-0">
              <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 px-4 py-4">
                <div className="min-w-0">
                  <p className="text-lg font-medium tracking-[-0.01em]">
                    {empresa.razaoSocial}
                  </p>
                  {empresa.nomeFantasia ? (
                    <p className="mt-0.5 text-xs text-read-soft">{empresa.nomeFantasia}</p>
                  ) : null}
                  <p className="readout mt-1 text-xs text-read-soft">
                    {documentMask(empresa.cnpj)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <div>
                    <p className="readout text-[10px] tracking-[0.2em] text-read-faint uppercase">
                      Responsável legal
                    </p>
                    <p className="mt-1 text-sm">{empresa.responsavel.nome}</p>
                    <p className="readout mt-0.5 text-xs text-read-soft">
                      {documentMask(empresa.responsavel.cpf)}
                    </p>
                  </div>
                  <div>
                    <p className="readout text-[10px] tracking-[0.2em] text-read-faint uppercase">
                      Contato
                    </p>
                    <p className="mt-1 text-sm">{empresa.emailContato}</p>
                    <p className="readout mt-0.5 text-xs text-read-soft">
                      {maskTelefone(empresa.telefoneContato)}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
