"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import type { BffInvoice } from "@/lib/bff";
import { dateShort, money } from "@/lib/format";
import { PixChargeButton } from "./pix-charge";
import { ChargeChip, InvoiceStamp, RailChip } from "./status-stamp";

const helper = createColumnHelper<BffInvoice>();

const columns = [
  helper.accessor("id", {
    header: "Nº",
    cell: (info) => <span className="font-mono text-xs">{String(info.getValue()).padStart(4, "0")}</span>,
  }),
  helper.accessor("client.name", {
    id: "client",
    header: "Cliente",
    cell: (info) => (
      <Link href={`/clients/${info.row.original.client.id}`} className="underline decoration-dotted underline-offset-2 hover:bg-synth">
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor("contract.title", { id: "contract", header: "Contrato" }),
  helper.accessor("amount", {
    header: "Valor",
    cell: (info) => (
      <span className="block text-right font-mono text-sm">{money(info.getValue())}</span>
    ),
  }),
  helper.accessor("dueDate", {
    header: "Vencimento",
    cell: (info) => dateShort(info.getValue()),
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <InvoiceStamp status={info.getValue()} size="text-[13px]" />,
  }),
  helper.accessor((row) => row.charge?.rail ?? "—", {
    id: "rail",
    header: "Trilho",
    cell: (info) =>
      info.row.original.charge ? (
        <div className="flex flex-col items-start gap-1">
          <RailChip rail={info.row.original.charge.rail} />
          <ChargeChip status={info.row.original.charge.status} />
        </div>
      ) : (
        <span className="text-xs text-ink-soft/60">—</span>
      ),
  }),
  helper.display({
    id: "action",
    header: "",
    cell: (info) => (
      <PixChargeButton
        invoiceId={info.row.original.id}
        invoiceStatus={info.row.original.status}
        existingCharge={info.row.original.charge}
      />
    ),
  }),
];

/** Tabela TanStack: ordenação client-side na página corrente; paginação vem da
    querystring (BFF/Pageable manda — o front não decide página de dados). */
export function InvoicesTable({ invoices }: { invoices: BffInvoice[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: invoices,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b-4 border-ink text-left">
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="px-2 py-2 align-bottom">
                  {header.isPlaceholder ? null : (
                    <button
                      type="button"
                      onClick={header.column.getToggleSortingHandler()}
                      disabled={!header.column.getCanSort()}
                      className="text-[11px] font-bold tracking-[0.18em] uppercase disabled:cursor-default"
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {{ asc: " ▲", desc: " ▼" }[header.column.getIsSorted() as string] ?? ""}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="rule-dotted align-top hover:bg-paper-deep">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-2.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
