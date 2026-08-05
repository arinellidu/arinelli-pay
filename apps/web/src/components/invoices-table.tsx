"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { BffInvoice } from "@/lib/bff";
import { dateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Money } from "./money";
import { PixChargeButton } from "./pix-charge";
import { ChargeState, InvoiceStatus, RailBadge } from "./status-badge";

const helper = createColumnHelper<BffInvoice>();

const columns = [
  helper.accessor("id", {
    header: "Nº",
    cell: (info) => (
      <span className="readout text-xs text-read-faint">
        {String(info.getValue()).padStart(4, "0")}
      </span>
    ),
  }),
  helper.accessor("client.name", {
    id: "client",
    header: "Cliente",
    cell: (info) => (
      <Link
        href={`/clients/${info.row.original.client.id}`}
        className="underline decoration-white/20 underline-offset-4 hover:text-signal-bright hover:decoration-signal/60"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor("contract.title", {
    id: "contract",
    header: "Contrato",
    cell: (info) => <span className="text-read-soft">{info.getValue()}</span>,
  }),
  helper.accessor("amount", {
    header: "Valor",
    cell: (info) => (
      <div className="text-right">
        <Money value={info.getValue()} className="text-sm" />
      </div>
    ),
  }),
  helper.accessor("dueDate", {
    header: "Vencimento",
    cell: (info) => (
      <span className="readout text-xs text-read-soft">{dateShort(info.getValue())}</span>
    ),
  }),
  helper.accessor("status", {
    header: "Status",
    cell: (info) => <InvoiceStatus status={info.getValue()} />,
  }),
  helper.accessor((row) => row.charge?.rail ?? "—", {
    id: "rail",
    header: "Trilho",
    cell: (info) =>
      info.row.original.charge ? (
        <div className="flex flex-col items-start gap-1.5">
          <RailBadge rail={info.row.original.charge.rail} />
          <ChargeState status={info.row.original.charge.status} />
        </div>
      ) : (
        <span className="text-xs text-read-faint" aria-label="sem cobrança">
          —
        </span>
      ),
  }),
  helper.display({
    id: "action",
    header: "",
    cell: (info) => (
      <div className="flex justify-end">
        <PixChargeButton
          invoiceId={info.row.original.id}
          invoiceStatus={info.row.original.status}
          amount={info.row.original.amount}
          clientName={info.row.original.client.name}
          existingCharge={info.row.original.charge}
        />
      </div>
    ),
  }),
];

/**
 * Leitura densa da mesma carteira: ordenação client-side na página corrente;
 * a paginação continua vindo da querystring (o front não decide página de dados).
 */
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
    <div className="surface-panel surface-frame surface-scan overflow-hidden rounded-xl">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-white/12 bg-black/30 text-left shadow-[inset_0_1px_0_rgb(255_255_255/6%)]"
              >
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const sortable = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                      className={cn(
                        "px-3 py-2.5 align-middle",
                        header.column.id === "amount" && "text-right",
                      )}
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          disabled={!sortable}
                          title={sortable ? "Ordena as faturas desta página" : undefined}
                          className={cn(
                            "readout inline-flex items-center gap-1.5 rounded-sm text-[10px] tracking-[0.18em] uppercase disabled:cursor-default",
                            sorted ? "text-read" : "text-read-faint",
                            sortable && "hover:text-read",
                            header.column.id === "amount" && "flex-row-reverse",
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortable ? (
                            sorted === "asc" ? (
                              <ChevronUp className="size-3" aria-hidden />
                            ) : sorted === "desc" ? (
                              <ChevronDown className="size-3" aria-hidden />
                            ) : (
                              <ChevronsUpDown className="size-3 opacity-50" aria-hidden />
                            )
                          ) : null}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-white/6 align-middle last:border-b-0 hover:bg-white/4"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
