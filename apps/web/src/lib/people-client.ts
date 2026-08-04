import type { CampoErros } from "@/lib/people-schema";

const BFF = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:3001";

export type CadastroResultado =
  | { ok: true }
  | { ok: false; message: string; fieldErrors?: CampoErros };

/**
 * POST do formulário direto ao BFF (mesmo caminho do "Cobrar via Pix"). O 400
 * vem como { message, fieldErrors } do MESMO schema zod que validou no client
 * — o formulário devolve cada mensagem ao campo dela via setError.
 */
export async function cadastrarPessoa(
  tipo: "pf" | "pj",
  payload: unknown,
): Promise<CadastroResultado> {
  try {
    const response = await fetch(`${BFF}/bff/people/${tipo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (response.ok) {
      return { ok: true };
    }
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      fieldErrors?: CampoErros;
    } | null;
    return {
      ok: false,
      message: body?.message ?? `Falha ao cadastrar (HTTP ${response.status})`,
      fieldErrors: body?.fieldErrors,
    };
  } catch {
    return { ok: false, message: "Não foi possível consultar o BFF — tente de novo" };
  }
}

/** ViaCEP: preenchimento automático do endereço a partir do CEP. */
export interface CepResultado {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export async function buscarCep(cep: string): Promise<CepResultado | null> {
  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  if (!response.ok) {
    throw new Error(`ViaCEP respondeu ${response.status}`);
  }
  const body = (await response.json()) as {
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (body.erro) {
    return null;
  }
  return {
    logradouro: body.logradouro ?? "",
    bairro: body.bairro ?? "",
    cidade: body.localidade ?? "",
    uf: body.uf ?? "",
  };
}
