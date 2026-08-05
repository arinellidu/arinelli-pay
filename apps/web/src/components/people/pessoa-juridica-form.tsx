"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pessoaJuridicaSchema, type PessoaJuridica, type PessoaJuridicaPayload } from "@/lib/people-schema";
import { atualizarPessoa, cadastrarPessoa, type CadastroResultado } from "@/lib/people-client";
import { documentMask } from "@/lib/format";
import { maskCep, maskCnpj, maskTelefone } from "@/lib/masks";
import { cn } from "@/lib/utils";
import { EnderecoFields } from "./endereco-fields";
import { FieldError, FieldLabel, FormSection, TextField } from "./form-field";

interface PjFormValues {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  emailContato: string;
  telefoneContato: string;
  responsavelId: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const valoresIniciais: PjFormValues = {
  razaoSocial: "",
  nomeFantasia: "",
  cnpj: "",
  emailContato: "",
  telefoneContato: "",
  responsavelId: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

function pjToFormValues(empresa: PessoaJuridica): PjFormValues {
  return {
    razaoSocial: empresa.razaoSocial,
    nomeFantasia: empresa.nomeFantasia ?? "",
    cnpj: maskCnpj(empresa.cnpj),
    emailContato: empresa.emailContato,
    telefoneContato: maskTelefone(empresa.telefoneContato),
    responsavelId: String(empresa.responsavel.id),
    cep: empresa.cep ? maskCep(empresa.cep) : "",
    logradouro: empresa.logradouro ?? "",
    numero: empresa.numero ?? "",
    complemento: empresa.complemento ?? "",
    bairro: empresa.bairro ?? "",
    cidade: empresa.cidade ?? "",
    uf: empresa.uf ?? "",
  };
}

export interface PessoaJuridicaFormProps {
  responsaveis: ResponsavelOption[];
  empresa?: PessoaJuridica;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface ResponsavelOption {
  id: number;
  nome: string;
  cpf: string;
}

/**
 * PJ nasce atrelada a uma PF responsável legal: o select lista as pessoas
 * físicas já cadastradas, e sem nenhuma o formulário aponta o caminho em vez
 * de deixar cadastrar errado. Validação idêntica no form e no BFF (schema
 * espelhado); o 409 de CNPJ repetido e o 422 de responsável inexistente voltam
 * para o campo de origem.
 */
export function PessoaJuridicaForm({
  responsaveis,
  empresa,
  open: controlledOpen,
  onOpenChange,
}: PessoaJuridicaFormProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen;
  const isEdit = empresa != null;
  const refreshPendente = useRef(false);

  const form = useForm<PjFormValues, unknown, PessoaJuridicaPayload>({
    resolver: zodResolver(pessoaJuridicaSchema) as unknown as Resolver<
      PjFormValues,
      unknown,
      PessoaJuridicaPayload
    >,
    defaultValues: valoresIniciais,
    mode: "onTouched",
  });
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = form;

  useEffect(() => {
    if (!open) return;
    reset(isEdit && empresa ? pjToFormValues(empresa) : valoresIniciais);
  }, [open, isEdit, empresa, reset]);

  const semResponsaveis = responsaveis.length === 0;

  const opcoesResponsavel = [
    { value: "", label: "Selecione…" },
    ...responsaveis.map((pf) => ({
      value: String(pf.id),
      label: `${pf.nome} — ${documentMask(pf.cpf)}`,
    })),
  ];

  const aplicarErrosDoServidor = (resultado: Extract<CadastroResultado, { ok: false }>) => {
    const campos = Object.entries(resultado.fieldErrors ?? {});
    let mapeado = false;
    for (const [campo, mensagens] of campos) {
      if (campo in valoresIniciais && mensagens.length > 0) {
        setError(campo as keyof PjFormValues, { type: "server", message: mensagens[0] });
        mapeado = true;
      }
    }
    if (!mapeado) {
      setError("root.server", { message: resultado.message });
    }
  };

  const onSubmit = handleSubmit(async (payload) => {
    const resultado =
      isEdit && empresa
        ? await atualizarPessoa("pj", empresa.id, payload)
        : await cadastrarPessoa("pj", payload);
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
          <Building2 data-icon="inline-start" />
          Nova pessoa jurídica
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
              {isEdit ? "Editar pessoa jurídica" : "Nova pessoa jurídica"}
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-read-soft">
              CNPJ, nome da empresa, contato e responsável legal são obrigatórios.
            </DialogDescription>
          </div>

          <FormProvider {...form}>
            <form onSubmit={(e) => void onSubmit(e)} noValidate className="space-y-4 px-5 py-5">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <TextField
                    label="Nome da empresa"
                    registration={register("razaoSocial")}
                    error={errors.razaoSocial?.message}
                    autoComplete="organization"
                    autoFocus
                  />
                  <TextField
                    label="CNPJ"
                    registration={register("cnpj")}
                    mask={maskCnpj}
                    error={errors.cnpj?.message}
                    inputMode="numeric"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <TextField
                  label="Nome fantasia"
                  optional
                  registration={register("nomeFantasia")}
                  error={errors.nomeFantasia?.message}
                />
              </div>

              <FormSection label="Responsável legal">
                {semResponsaveis ? (
                  <p className="rounded-md border border-white/8 bg-white/4 px-3 py-2.5 text-xs leading-relaxed text-read-soft">
                    Toda pessoa jurídica nasce atrelada a uma pessoa física — e ainda não
                    há nenhuma cadastrada.{" "}
                    <Link
                      href="/pessoas/fisicas"
                      className="text-read underline decoration-white/20 underline-offset-4 hover:text-signal"
                    >
                      Cadastre a primeira pessoa física
                    </Link>{" "}
                    e volte aqui.
                  </p>
                ) : (
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <FieldLabel htmlFor="responsavelId">Pessoa física responsável</FieldLabel>
                    <Controller
                      control={control}
                      name="responsavelId"
                      render={({ field }) => (
                        <Select
                          items={opcoesResponsavel}
                          value={field.value}
                          onValueChange={(value) => field.onChange(value ?? "")}
                        >
                          <SelectTrigger
                            id="responsavelId"
                            aria-invalid={errors.responsavelId ? true : undefined}
                            aria-describedby={
                              errors.responsavelId ? "responsavelId-erro" : undefined
                            }
                            className={cn(
                              "h-9 w-full bg-white/4 text-sm hover:bg-white/8",
                              errors.responsavelId ? "border-alert/70" : "border-input",
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="surface-panel surface-frame surface-scan glass-deep rounded-lg">
                            {opcoesResponsavel.map((opcao) => (
                              <SelectItem key={opcao.value || "vazio"} value={opcao.value}>
                                {opcao.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError id="responsavelId-erro" message={errors.responsavelId?.message} />
                  </div>
                )}
              </FormSection>

              <FormSection label="Contato">
                <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
                  <TextField
                    label="E-mail de contato"
                    registration={register("emailContato")}
                    error={errors.emailContato?.message}
                    type="email"
                    autoComplete="email"
                    placeholder="contato@empresa.com.br"
                  />
                  <TextField
                    label="Telefone de contato"
                    registration={register("telefoneContato")}
                    mask={maskTelefone}
                    error={errors.telefoneContato?.message}
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="(00) 0000-0000"
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
                <Button type="submit" variant="glass" disabled={isSubmitting || semResponsaveis}>
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
