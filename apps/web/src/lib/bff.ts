/** Leitura server-side direto do BFF (ADR-003: o front não fala com o core). */

import type { PessoaFisica, PessoaJuridica } from "@/lib/people-schema";

const BFF_URL = process.env.BFF_URL ?? "http://localhost:3001";

export interface Client {
  id: number;
  document: string;
  documentType: "CPF" | "CNPJ";
  name: string;
  email: string | null;
  createdAt: string;
}

export interface Contract {
  id: number;
  clientId: number;
  clientName: string;
  clientDocument: string;
  clientDocumentType: "CPF" | "CNPJ";
  title: string;
  amount: number;
  billingDay: number;
  status: "ACTIVE" | "ENDED";
  nextDueDate: string | null;
  createdAt: string;
}

export interface BffInvoice {
  id: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  client: { id: number; name: string };
  contract: { id: number; title: string };
  charge: {
    id: number;
    rail: string;
    status: string;
    emv: string | null;
    providerRef: string | null;
  } | null;
}

export interface InvoicePage {
  content: BffInvoice[];
  page: { size: number; number: number; totalElements: number; totalPages: number };
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BFF_URL}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`BFF ${path} respondeu ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const bff = {
  clients: () => get<Client[]>("/bff/clients"),
  client: (id: string) => get<Client>(`/bff/clients/${id}`),
  contractsOf: (clientId: string) => get<Contract[]>(`/bff/contracts?clientId=${clientId}`),
  invoices: (query: string) => get<InvoicePage>(`/bff/invoices${query ? `?${query}` : ""}`),
  pessoasFisicas: () => get<PessoaFisica[]>("/bff/people/pf"),
  pessoasJuridicas: () => get<PessoaJuridica[]>("/bff/people/pj"),
};

export async function generateNextInvoice(contractId: number): Promise<void> {
  const response = await fetch(
    `${BFF_URL}/bff/contracts/${contractId}/invoices:generate-next`,
    { method: "POST" },
  );
  if (!response.ok) {
    throw new Error(`generate-next respondeu ${response.status}`);
  }
}
