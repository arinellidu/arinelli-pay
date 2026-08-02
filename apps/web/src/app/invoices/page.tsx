import Link from "next/link";
import { bff } from "@/lib/bff";
import { InvoiceCards } from "@/components/invoice-cards";
import { InvoicesTable } from "@/components/invoices-table";
import { SpecimenHeader } from "@/components/specimen-header";
import { ViewToggle } from "@/components/view-toggle";

interface Search {
  status?: string;
  rail?: string;
  clientId?: string;
  from?: string;
  to?: string;
  page?: string;
  view?: string;
}

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const view = params.view === "table" ? "table" : "cards";

  const upstream = new URLSearchParams();
  if (params.status) upstream.set("status", params.status);
  if (params.clientId) upstream.set("clientId", params.clientId);
  if (params.from) upstream.set("from", params.from);
  if (params.to) upstream.set("to", params.to);
  upstream.set("page", params.page ?? "0");
  upstream.set("size", "12");

  const [pageData, clients] = await Promise.all([
    bff.invoices(upstream.toString()),
    bff.clients(),
  ]);

  // filtro de trilho é recorte de tela sobre a página corrente (o core ainda
  // não filtra por rail — v1); os demais filtros são do backend
  const invoices =
    params.rail && params.rail !== ""
      ? pageData.content.filter((invoice) => invoice.charge?.rail === params.rail)
      : pageData.content;

  // sem filtro de status, o que exige ação vem primeiro: VENCIDA, depois
  // ABERTA por vencimento, PAGA/CANCELADA por último — o primeiro viewport
  // carrega a urgência e a ação verde
  const actionRank: Record<string, number> = { OVERDUE: 0, OPEN: 1, DRAFT: 2, PAID: 3, CANCELED: 4 };
  const ordered = params.status
    ? invoices
    : [...invoices].sort(
        (a, b) =>
          (actionRank[a.status] ?? 9) - (actionRank[b.status] ?? 9) ||
          a.dueDate.localeCompare(b.dueDate),
      );

  const railCut = params.rail ? { shown: ordered.length, of: pageData.content.length } : null;

  const makeHref = (overrides: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { ...params, ...overrides };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    return `/invoices${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <SpecimenHeader
        word="FATURAS"
        note="Cada carimbo desta página nasce de um evento real: webhook HMAC verificado → outbox → worker Go. Nada aqui é estado inventado no front."
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <FilterForm params={params} clients={clients} />
        <ViewToggle view={view} makeHref={(v) => makeHref({ view: v, page: "0" })} />
      </div>

      {ordered.length === 0 ? (
        <EmptyState hasFilters={Boolean(params.status || params.clientId || params.rail || params.from || params.to)} />
      ) : view === "table" ? (
        <InvoicesTable invoices={ordered} />
      ) : (
        <InvoiceCards invoices={ordered} />
      )}

      {railCut ? (
        <p className="mt-6 text-xs text-ink-soft">
          {railCut.shown} de {railCut.of} nesta página (recorte local de trilho) ·{" "}
          {pageData.page.totalElements} no total
        </p>
      ) : (
        <Pagination
          page={pageData.page.number}
          totalPages={pageData.page.totalPages}
          totalElements={pageData.page.totalElements}
          makeHref={(page) => makeHref({ page: String(page) })}
        />
      )}
    </div>
  );
}

function FilterForm({
  params,
  clients,
}: {
  params: Search;
  clients: { id: number; name: string }[];
}) {
  const select =
    "border-2 border-ink bg-paper px-2 py-1.5 text-xs font-medium tracking-wide";
  return (
    <form method="get" action="/invoices" className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="view" value={params.view ?? "cards"} />
      <label className="flex flex-col gap-1 text-[10px] font-bold tracking-[0.2em] text-ink-soft">
        STATUS
        <select name="status" defaultValue={params.status ?? ""} className={select}>
          <option value="">todas</option>
          <option value="OPEN">abertas</option>
          <option value="PAID">pagas</option>
          <option value="OVERDUE">vencidas</option>
          <option value="CANCELED">canceladas</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] font-bold tracking-[0.2em] text-ink-soft">
        TRILHO
        <select name="rail" defaultValue={params.rail ?? ""} className={select}>
          <option value="">todos</option>
          <option value="PIX">Pix</option>
          <option value="BOLETO">boleto</option>
          <option value="CARD">cartão</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] font-bold tracking-[0.2em] text-ink-soft">
        CLIENTE
        <select name="clientId" defaultValue={params.clientId ?? ""} className={select}>
          <option value="">todos</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-[10px] font-bold tracking-[0.2em] text-ink-soft">
        DE
        <input type="date" name="from" defaultValue={params.from ?? ""} className={select} />
      </label>
      <label className="flex flex-col gap-1 text-[10px] font-bold tracking-[0.2em] text-ink-soft">
        ATÉ
        <input type="date" name="to" defaultValue={params.to ?? ""} className={select} />
      </label>
      <button
        type="submit"
        className="px-corners bg-ink px-3 py-2 text-xs font-bold tracking-[0.16em] text-paper hover:bg-ink-soft"
      >
        FILTRAR
      </button>
      <Link
        href="/invoices"
        className="px-2 py-2 text-xs text-ink-soft underline decoration-dotted hover:text-ink"
      >
        limpar
      </Link>
    </form>
  );
}

function Pagination({
  page,
  totalPages,
  totalElements,
  makeHref,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  makeHref: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return (
      <p className="mt-6 text-xs text-ink-soft">
        {totalElements} fatura{totalElements === 1 ? "" : "s"}
      </p>
    );
  }
  return (
    <nav className="mt-6 flex items-center gap-3 text-xs" aria-label="Paginação">
      {page > 0 ? (
        <Link href={makeHref(page - 1)} className="border-2 border-ink px-2 py-1 font-bold hover:bg-ink hover:text-paper">
          ← ANTERIOR
        </Link>
      ) : null}
      <span className="bitmap text-step-16">
        PÁG {page + 1}/{totalPages}
      </span>
      {page + 1 < totalPages ? (
        <Link href={makeHref(page + 1)} className="border-2 border-ink px-2 py-1 font-bold hover:bg-ink hover:text-paper">
          PRÓXIMA →
        </Link>
      ) : null}
      <span className="text-ink-soft">{totalElements} no total</span>
    </nav>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="halftone-fine border-2 border-dashed border-ink/40 px-6 py-14 text-center">
      <p className="bitmap text-step-32 text-ink-soft">NADA POR AQUI</p>
      <p className="mx-auto mt-2 max-w-[48ch] text-sm text-ink-soft">
        {hasFilters
          ? "Nenhuma fatura bate com esses filtros. Limpe os filtros ou mude o período."
          : "Nenhuma fatura ainda. Abra um cliente, escolha um contrato e gere a próxima fatura."}
      </p>
    </div>
  );
}
