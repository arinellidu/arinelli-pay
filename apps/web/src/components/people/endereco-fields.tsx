"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import { buscarCep } from "@/lib/people-client";
import { maskCep } from "@/lib/masks";
import { FormSection, TextField } from "./form-field";

export interface EnderecoValues {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

type CepStatus = "idle" | "buscando" | "preenchido" | "nao-encontrado" | "falhou";

/**
 * Bloco de endereço com CEP automático: 8 dígitos completos disparam o ViaCEP
 * e preenchem logradouro/bairro/cidade/UF — todos continuam editáveis, e a
 * falha do lookup nunca trava o cadastro (endereço inteiro é opcional).
 */
export function EnderecoFields() {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<EnderecoValues>();

  const cep = watch("cep");
  const [status, setStatus] = useState<CepStatus>("idle");
  const ultimoCep = useRef("");

  useEffect(() => {
    const digitos = (cep ?? "").replace(/\D/g, "");
    if (digitos.length !== 8 || digitos === ultimoCep.current) {
      return;
    }
    ultimoCep.current = digitos;
    let cancelado = false;
    setStatus("buscando");
    buscarCep(digitos)
      .then((endereco) => {
        if (cancelado) return;
        if (!endereco) {
          setStatus("nao-encontrado");
          return;
        }
        setValue("logradouro", endereco.logradouro, { shouldDirty: true });
        setValue("bairro", endereco.bairro, { shouldDirty: true });
        setValue("cidade", endereco.cidade, { shouldDirty: true });
        setValue("uf", endereco.uf, { shouldDirty: true });
        setStatus("preenchido");
      })
      .catch(() => {
        if (!cancelado) setStatus("falhou");
      });
    return () => {
      cancelado = true;
    };
  }, [cep, setValue]);

  return (
    <FormSection label="Endereço" optional>
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
          <TextField
            label="CEP"
            registration={register("cep")}
            mask={maskCep}
            error={errors.cep?.message}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
          />
          <TextField
            label="Logradouro"
            registration={register("logradouro")}
            error={errors.logradouro?.message}
            autoComplete="address-line1"
          />
        </div>
        <p
          role="status"
          className={
            status === "nao-encontrado" || status === "falhou"
              ? "text-xs text-alert"
              : "text-xs text-read-soft"
          }
        >
          {status === "buscando" && "Buscando endereço…"}
          {status === "preenchido" && "Endereço preenchido pelo CEP — confira o número."}
          {status === "nao-encontrado" && "CEP não encontrado — preencha manualmente."}
          {status === "falhou" && "ViaCEP fora do ar — preencha manualmente."}
        </p>
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <TextField
            label="Número"
            registration={register("numero")}
            error={errors.numero?.message}
          />
          <TextField
            label="Complemento"
            registration={register("complemento")}
            error={errors.complemento?.message}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_5rem]">
          <TextField
            label="Bairro"
            registration={register("bairro")}
            error={errors.bairro?.message}
          />
          <TextField
            label="Cidade"
            registration={register("cidade")}
            error={errors.cidade?.message}
          />
          <TextField
            label="UF"
            registration={register("uf")}
            error={errors.uf?.message}
            maxLength={2}
            autoComplete="address-level1"
          />
        </div>
      </div>
    </FormSection>
  );
}
