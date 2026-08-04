import { z } from "zod";

/**
 * Schema de Pessoa Física / Pessoa Jurídica — validação ESPELHADA.
 *
 * Este arquivo existe idêntico em dois lugares:
 *   apps/web/src/lib/people-schema.ts     (validação do formulário, react-hook-form)
 *   apps/bff/src/people/people-schema.ts  (validação do POST no BFF)
 *
 * Front e back validam com o MESMO schema por construção; o teste
 * people-schema.sync.spec.ts (BFF) compara os dois arquivos byte a byte e
 * quebra se alguém editar um lado só.
 *
 * Obrigatórios primários: PF = nome + CPF; PJ = CNPJ + nome da empresa +
 * e-mail e telefone de contato + responsável legal (uma PF já cadastrada).
 * Todo o resto — inclusive o endereço preenchido via CEP — é opcional.
 */

export const soDigitos = (valor: string): string => valor.replace(/\D/g, "");

/** Dígitos verificadores de CPF — mesmo algoritmo do DocumentValidator do core (P01). */
export function cpfValido(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }
  const dv = (tamanho: number): number => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return dv(9) === Number(cpf[9]) && dv(10) === Number(cpf[10]);
}

/** Dígitos verificadores de CNPJ — mesmo algoritmo do DocumentValidator do core (P01). */
export function cnpjValido(cnpj: string): boolean {
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }
  const dv = (tamanho: number): number => {
    const pesos =
      tamanho === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cnpj[i]) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  return dv(12) === Number(cnpj[12]) && dv(13) === Number(cnpj[13]);
}

/** DDD (2 dígitos, não começa em 0) + fixo ou celular: 10 ou 11 dígitos no total. */
export function telefoneValido(telefone: string): boolean {
  return /^[1-9]\d{9,10}$/.test(telefone);
}

const textoVazioComoUndefined = (valor: unknown) =>
  typeof valor === "string" && valor.trim() === "" ? undefined : valor;

/** Campo opcional de formulário: string vazia conta como "não informado". */
const opcional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(textoVazioComoUndefined, schema.optional());

const cpfObrigatorio = z
  .string()
  .min(1, "Informe o CPF")
  .transform(soDigitos)
  .refine(cpfValido, "CPF inválido — confira os dígitos");

const cnpjObrigatorio = z
  .string()
  .min(1, "Informe o CNPJ")
  .transform(soDigitos)
  .refine(cnpjValido, "CNPJ inválido — confira os dígitos");

const telefoneTransformado = z
  .string()
  .transform(soDigitos)
  .refine(telefoneValido, "Telefone inválido — use DDD + número");

const enderecoOpcional = {
  cep: opcional(
    z
      .string()
      .transform(soDigitos)
      .refine((valor) => valor.length === 8, "CEP tem 8 dígitos"),
  ),
  logradouro: opcional(z.string().trim().max(160, "Máximo de 160 caracteres")),
  numero: opcional(z.string().trim().max(20, "Máximo de 20 caracteres")),
  complemento: opcional(z.string().trim().max(80, "Máximo de 80 caracteres")),
  bairro: opcional(z.string().trim().max(80, "Máximo de 80 caracteres")),
  cidade: opcional(z.string().trim().max(80, "Máximo de 80 caracteres")),
  uf: opcional(
    z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "UF em 2 letras"),
  ),
};

export const pessoaFisicaSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, "Informe o nome completo")
    .max(160, "Máximo de 160 caracteres"),
  cpf: cpfObrigatorio,
  email: opcional(z.email("E-mail inválido").max(160, "Máximo de 160 caracteres")),
  telefone: opcional(telefoneTransformado),
  ...enderecoOpcional,
});

export const pessoaJuridicaSchema = z.object({
  razaoSocial: z
    .string()
    .trim()
    .min(3, "Informe o nome da empresa")
    .max(160, "Máximo de 160 caracteres"),
  nomeFantasia: opcional(z.string().trim().max(160, "Máximo de 160 caracteres")),
  cnpj: cnpjObrigatorio,
  emailContato: z
    .string()
    .trim()
    .min(1, "Informe o e-mail de contato")
    .pipe(z.email("E-mail de contato inválido").max(160, "Máximo de 160 caracteres")),
  telefoneContato: z
    .string()
    .min(1, "Informe o telefone de contato")
    .pipe(telefoneTransformado),
  responsavelId: z.preprocess(
    (valor) => (valor === "" || valor == null ? undefined : Number(valor)),
    z
      .number({ error: "Selecione a pessoa física responsável" })
      .int("Selecione a pessoa física responsável")
      .positive("Selecione a pessoa física responsável"),
  ),
  ...enderecoOpcional,
});

/** O que o POST validado entrega (documentos já sem máscara). */
export type PessoaFisicaPayload = z.output<typeof pessoaFisicaSchema>;
export type PessoaJuridicaPayload = z.output<typeof pessoaJuridicaSchema>;

/** Corpo de erro 400 do BFF: um array de mensagens por campo reprovado. */
export type CampoErros = Record<string, string[]>;

export function errosPorCampo(error: z.ZodError): CampoErros {
  return z.flattenError(error).fieldErrors as CampoErros;
}

// --- DTOs de leitura (o que o GET do BFF devolve) ---

export interface Endereco {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface PessoaFisica extends Endereco {
  id: number;
  nome: string;
  cpf: string;
  email?: string;
  telefone?: string;
  criadoEm: string;
}

export interface PessoaJuridica extends Endereco {
  id: number;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  emailContato: string;
  telefoneContato: string;
  /** Toda PJ nasce atrelada a uma PF já cadastrada — o responsável legal. */
  responsavel: { id: number; nome: string; cpf: string };
  criadoEm: string;
}
