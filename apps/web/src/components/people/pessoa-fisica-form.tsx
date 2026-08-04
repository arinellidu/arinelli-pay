"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { pessoaFisicaSchema, type PessoaFisicaPayload } from "@/lib/people-schema";
import { cadastrarPessoa, type CadastroResultado } from "@/lib/people-client";
import { maskCpf, maskTelefone } from "@/lib/masks";
import { EnderecoFields } from "./endereco-fields";
import { FormSection, TextField } from "./form-field";

interface PfFormValues {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const valoresIniciais: PfFormValues = {
  nome: "",
  cpf: "",
  email: "",
  telefone: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/**
 * O formulário valida com o MESMO schema zod do BFF (people-schema.ts
 * espelhado). Um 400/409 do servidor volta como { fieldErrors } e cai no campo
 * de origem via setError — a mensagem que o back recusou é a que o campo mostra.
 */
export function PessoaFisicaForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<PfFormValues, unknown, PessoaFisicaPayload>({
    // o schema transforma (tira máscara), então o tipo de entrada é o do form
    resolver: zodResolver(pessoaFisicaSchema) as unknown as Resolver<
      PfFormValues,
      unknown,
      PessoaFisicaPayload
    >,
    defaultValues: valoresIniciais,
    mode: "onTouched",
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  const aplicarErrosDoServidor = (resultado: Extract<CadastroResultado, { ok: false }>) => {
    const campos = Object.entries(resultado.fieldErrors ?? {});
    let mapeado = false;
    for (const [campo, mensagens] of campos) {
      if (campo in valoresIniciais && mensagens.length > 0) {
        setError(campo as keyof PfFormValues, { type: "server", message: mensagens[0] });
        mapeado = true;
      }
    }
    if (!mapeado) {
      setError("root.server", { message: resultado.message });
    }
  };

  const onSubmit = handleSubmit(async (payload) => {
    const resultado = await cadastrarPessoa("pf", payload);
    if (resultado.ok) {
      reset();
      setOpen(false);
      router.refresh();
      return;
    }
    aplicarErrosDoServidor(resultado);
  });

  const fechar = (proximo: boolean) => {
    setOpen(proximo);
    if (!proximo) reset();
  };

  return (
    <>
      <Button variant="glass" onClick={() => setOpen(true)}>
        <UserRoundPlus data-icon="inline-start" />
        Nova pessoa física
      </Button>

      <Dialog open={open} onOpenChange={fechar}>
        <DialogContent className="glass-deep max-h-[92dvh] overflow-y-auto rounded-xl p-0 sm:max-w-lg">
          <div className="border-b border-white/10 px-5 py-3.5 pr-12">
            <DialogTitle className="readout text-[13px] font-medium tracking-[0.18em] uppercase">
              Nova pessoa física
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-read-soft">
              Só nome e CPF são obrigatórios. O CEP preenche o endereço sozinho.
            </DialogDescription>
          </div>

          <FormProvider {...form}>
            <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
                <TextField
                  label="Nome completo"
                  registration={register("nome")}
                  error={errors.nome?.message}
                  autoComplete="name"
                  autoFocus
                />
                <TextField
                  label="CPF"
                  registration={register("cpf")}
                  mask={maskCpf}
                  error={errors.cpf?.message}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                />
              </div>

              <FormSection label="Contato" optional>
                <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
                  <TextField
                    label="E-mail"
                    registration={register("email")}
                    error={errors.email?.message}
                    type="email"
                    autoComplete="email"
                    placeholder="nome@dominio.com.br"
                  />
                  <TextField
                    label="Telefone"
                    registration={register("telefone")}
                    mask={maskTelefone}
                    error={errors.telefone?.message}
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </FormSection>

              <EnderecoFields />

              {errors.root?.server?.message ? (
                <p
                  role="alert"
                  className="rounded-md border border-alert/30 bg-alert/10 px-3 py-2 text-sm text-alert"
                >
                  {errors.root.server.message}
                </p>
              ) : null}

              <div className="flex items-center justify-end gap-4 border-t border-white/8 pt-4">
                <DialogClose className="text-xs text-read-faint underline decoration-white/20 underline-offset-4 hover:text-read">
                  Cancelar
                </DialogClose>
                <Button type="submit" variant="glass" disabled={isSubmitting}>
                  {isSubmitting ? "Cadastrando…" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
