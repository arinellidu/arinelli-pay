import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { PessoaJuridicaForm } from "@/components/people/pessoa-juridica-form";
import { PessoasJuridicasList } from "@/components/people/pessoas-juridicas-list";

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
  const responsaveis = fisicas.map(({ id, nome, cpf }) => ({ id, nome, cpf }));

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
        <PessoaJuridicaForm responsaveis={responsaveis} />
      </div>

      {empresas.length === 0 ? (
        <div className="surface-panel surface-frame surface-scan rounded-xl px-6 py-16 text-center">
          <p className="text-2xl font-semibold tracking-[-0.01em]">
            Nenhuma pessoa jurídica
          </p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">
            Cadastre a primeira — ela precisa de uma pessoa física como responsável
            legal.
          </p>
        </div>
      ) : (
        <PessoasJuridicasList empresas={empresas} responsaveis={responsaveis} />
      )}
    </div>
  );
}
