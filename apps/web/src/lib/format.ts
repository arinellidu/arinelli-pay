const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateBr = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });

export function money(value: number | string): string {
  return brl.format(typeof value === "string" ? Number(value) : value);
}

export function dateShort(iso: string): string {
  return dateBr.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso));
}

export function documentMask(digits: string): string {
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return digits;
}

export const invoiceStatusLabel: Record<string, string> = {
  DRAFT: "RASCUNHO",
  OPEN: "ABERTA",
  PAID: "PAGA",
  OVERDUE: "VENCIDA",
  CANCELED: "CANCELADA",
};

export const chargeStatusLabel: Record<string, string> = {
  CREATED: "CRIADA",
  PENDING: "PENDENTE",
  SETTLED: "LIQUIDADA",
  FAILED: "FALHOU",
  REFUNDED: "DEVOLVIDA",
};
