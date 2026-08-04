/**
 * Máscaras de digitação e exibição — apresentação PURA. A validação nunca lê
 * máscara: o schema (people-schema.ts) remove tudo que não é dígito antes de
 * conferir os dígitos verificadores.
 */

const digits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

export function maskCpf(value: string): string {
  const d = digits(value, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

export function maskCnpj(value: string): string {
  const d = digits(value, 14);
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/\/(\d{4})(\d{1,2})$/, "/$1-$2");
}

export function maskTelefone(value: string): string {
  const d = digits(value, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(value: string): string {
  const d = digits(value, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
