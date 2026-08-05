"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  value: string;
  label: string;
}

const statusOptions: Option[] = [
  { value: "", label: "Todas" },
  { value: "OPEN", label: "Abertas" },
  { value: "PAID", label: "Pagas" },
  { value: "OVERDUE", label: "Vencidas" },
  { value: "CANCELED", label: "Canceladas" },
];

const railOptions: Option[] = [
  { value: "", label: "Todos" },
  { value: "PIX", label: "Pix" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CARD", label: "Cartão" },
];

const control =
  "surface-well h-9 w-full rounded-lg border border-signal/10 px-2.5 text-sm text-read outline-none transition-colors hover:border-signal/20 focus-visible:border-signal-bright/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="readout text-[10px] tracking-[0.2em] text-read-faint uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Régua de filtros. Continua sendo um GET nativo: o estado da tela mora na
 * querystring, então toda leitura é compartilhável e o servidor renderiza a
 * página já filtrada.
 */
export function InvoiceFilters({
  params,
  clients,
}: {
  params: { status?: string; rail?: string; clientId?: string; from?: string; to?: string; view?: string };
  clients: { id: number; name: string }[];
}) {
  const clientOptions: Option[] = [
    { value: "", label: "Todos" },
    ...clients.map((client) => ({ value: String(client.id), label: client.name })),
  ];

  return (
    <form
      method="get"
      action="/invoices"
      className="surface-toolbar surface-frame surface-scan grid w-full grid-cols-2 items-end gap-x-3 gap-y-3 rounded-xl p-3 sm:flex sm:flex-nowrap"
    >
      <input type="hidden" name="view" value={params.view ?? "cards"} />

      <div className="w-full sm:w-[8.5rem] sm:shrink-0">
        <Field label="Status">
          <SelectField name="status" defaultValue={params.status ?? ""} options={statusOptions} />
        </Field>
      </div>
      <div className="w-full sm:w-[7.5rem] sm:shrink-0">
        <Field label="Trilho">
          <SelectField name="rail" defaultValue={params.rail ?? ""} options={railOptions} />
        </Field>
      </div>
      <div className="col-span-2 w-full sm:min-w-0 sm:flex-1">
        <Field label="Cliente">
          <SelectField
            name="clientId"
            defaultValue={params.clientId ?? ""}
            options={clientOptions}
          />
        </Field>
      </div>
      <div className="w-full sm:w-[8.5rem] sm:shrink-0">
        <Field label="Vence de">
          <input type="date" name="from" defaultValue={params.from ?? ""} className={control} />
        </Field>
      </div>
      <div className="w-full sm:w-[8.5rem] sm:shrink-0">
        <Field label="Vence até">
          <input type="date" name="to" defaultValue={params.to ?? ""} className={control} />
        </Field>
      </div>

      <div className="col-span-2 flex shrink-0 items-center gap-3 sm:col-auto">
        <Button type="submit" variant="glass" className="h-9">
          Filtrar
        </Button>
        <Link
          href="/invoices"
          className="text-xs text-read-faint underline decoration-white/20 underline-offset-4 hover:text-read"
        >
          Limpar
        </Link>
      </div>
    </form>
  );
}

function SelectField({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: Option[];
}) {
  return (
    <Select name={name} defaultValue={defaultValue} items={options}>
      <SelectTrigger className="h-9 w-full border-input bg-white/4 text-sm hover:bg-white/8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="surface-panel surface-frame surface-scan glass-deep rounded-lg">
        {options.map((option) => (
          <SelectItem key={option.value || "all"} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
