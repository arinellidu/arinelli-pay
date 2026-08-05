import { bff } from "@/lib/bff";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
import { PessoaFisicaForm } from "@/components/people/pessoa-fisica-form";
import { PessoasFisicasList } from "@/components/people/pessoas-fisicas-list";

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
        <div className="surface-panel surface-frame surface-scan rounded-xl px-6 py-16 text-center">
          <p className="text-2xl font-semibold tracking-[-0.01em]">Nenhuma pessoa física</p>
          <p className="mx-auto mt-3 max-w-[46ch] text-sm text-read-soft">
            Cadastre a primeira — nome, CPF, e-mail e telefone são obrigatórios; endereço pode vir depois.
          </p>
        </div>
      ) : (
        <PessoasFisicasList pessoas={pessoas} />
      )}
    </div>
  );
}
