"use client";

import { useEffect, useRef, useState } from "react";
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
import {
  pessoaFisicaSchema,
  type PessoaFisica,
  type PessoaFisicaPayload,
} from "@/lib/people-schema";
import { atualizarPessoa, cadastrarPessoa, type CadastroResultado } from "@/lib/people-client";
import { maskCep, maskCpf, maskTelefone } from "@/lib/masks";
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

function pfToFormValues(pessoa: PessoaFisica): PfFormValues {
  return {
    nome: pessoa.nome,
    cpf: maskCpf(pessoa.cpf),
    email: pessoa.email ?? "",
    telefone: pessoa.telefone ? maskTelefone(pessoa.telefone) : "",
    cep: pessoa.cep ? maskCep(pessoa.cep) : "",
    logradouro: pessoa.logradouro ?? "",
    numero: pessoa.numero ?? "",
    complemento: pessoa.complemento ?? "",
    bairro: pessoa.bairro ?? "",
    cidade: pessoa.cidade ?? "",
    uf: pessoa.uf ?? "",
  };
}

export interface PessoaFisicaFormProps {
  pessoa?: PessoaFisica;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * O formulário valida com o MESMO schema zod do BFF (people-schema.ts
 * espelhado). Um 400/409 do servidor volta como { fieldErrors } e cai no campo
 * de origem via setError — a mensagem que o back recusou é a que o campo mostra.
 */
export function PessoaFisicaForm({ pessoa, open: controlledOpen, onOpenChange }: PessoaFisicaFormProps = {}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const isEdit = pessoa != null;
  const refreshPendente = useRef(false);

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

  useEffect(() => {
    if (!open) return;
    reset(isEdit && pessoa ? pfToFormValues(pessoa) : valoresIniciais);
  }, [open, isEdit, pessoa, reset]);

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
    const resultado =
      isEdit && pessoa
        ? await atualizarPessoa("pf", pessoa.id, payload)
        : await cadastrarPessoa("pf", payload);
    if (resultado.ok) {
      // a lista só repinta depois que o diálogo termina de sair: um refresh no
      // meio da animação reinicia a saída e o painel pisca de volta na tela
      refreshPendente.current = true;
      setOpen(false);
      return;
    }
    aplicarErrosDoServidor(resultado);
  });

  // Sem reset no fechamento: quem zera o formulário é o efeito de abertura. Um
  // reset aqui repintaria os valores anteriores durante a animação de saída.
  const fechar = (proximo: boolean) => setOpen(proximo);

  return (
    <>
      {!isControlled ? (
        <Button variant="glass" onClick={() => setOpen(true)}>
          <UserRoundPlus data-icon="inline-start" />
          Nova pessoa física
        </Button>
      ) : null}

      <Dialog
        open={open}
        onOpenChange={fechar}
        onOpenChangeComplete={(aberto) => {
          if (aberto || !refreshPendente.current) return;
          refreshPendente.current = false;
          router.refresh();
        }}
      >
        <DialogContent className="surface-panel surface-frame surface-scan surface-dialog glass-deep max-h-[92dvh] overflow-y-auto rounded-xl p-0 sm:max-w-lg">
          <div className="border-b border-white/10 px-5 py-3.5 pr-12">
            <DialogTitle className="readout text-[13px] font-medium tracking-[0.18em] uppercase">
              {isEdit ? "Editar pessoa física" : "Nova pessoa física"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-read-soft">
              Nome, CPF, e-mail e telefone são obrigatórios. Endereço pode ser preenchido depois.
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

              <FormSection label="Contato">
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
                  {isSubmitting
                    ? isEdit
                      ? "Salvando…"
                      : "Cadastrando…"
                    : isEdit
                      ? "Salvar"
                      : "Cadastrar"}
                </Button>
              </div>
            </form>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
