import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { bff } from "@/lib/bff";
import { FilterFold } from "@/components/filter-fold";
import { InvoiceCards } from "@/components/invoice-cards";
import { InvoiceFilters } from "@/components/invoice-filters";
import { InvoicesTable } from "@/components/invoices-table";
import { PageHeader, Readout, ReadoutStrip } from "@/components/page-header";
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

export const metadata = { title: "Faturas" };

const railLabel: Record<string, string> = { PIX: "Pix", BOLETO: "boleto", CARD: "cartão" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const view = params.view === "cards" ? "cards" : "table";

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

  // sem filtro de status, o que exige ação vem primeiro: vencidas, depois
  // abertas por vencimento, pagas/canceladas por último
  const actionRank: Record<string, number> = { OVERDUE: 0, OPEN: 1, DRAFT: 2, PAID: 3, CANCELED: 4 };
  const ordered = params.status
    ? invoices
    : [...invoices].sort(
        (a, b) =>
          (actionRank[a.status] ?? 9) - (actionRank[b.status] ?? 9) ||
          a.dueDate.localeCompare(b.dueDate),
      );

  const liveCharges = ordered.filter(
    (invoice) => invoice.charge?.status === "PENDING" && invoice.status !== "PAID",
  ).length;
  const railCut = params.rail ? { shown: ordered.length, of: pageData.content.length } : null;
  const invertedRange = Boolean(params.from && params.to && params.from > params.to);

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
      <PageHeader
        title="Faturas"
        note="Nenhum estado desta tela é decidido no front: a fatura só vira paga quando o webhook assinado é verificado, gravado no outbox e processado pelo worker Go."
        readout={
          <ReadoutStrip>
            <Readout label="Nesta página" value={ordered.length} />
            <Readout
              label="Cobranças vivas"
              value={liveCharges}
              tone={liveCharges > 0 ? "signal" : "read"}
            />
          </ReadoutStrip>
        }
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <FilterFold>
          <InvoiceFilters params={params} clients={clients} />
        </FilterFold>
        <ViewToggle view={view} makeHref={(v) => makeHref({ view: v, page: "0" })} />
      </div>

      {invertedRange ? (
        <p className="mb-4 text-xs text-alert" role="status">
          Período invertido: a data inicial vem depois da final, então nenhuma
          fatura pode bater. Troque as datas para ver resultados.
        </p>
      ) : null}

      {ordered.length === 0 ? (
        <EmptyState
          hasFilters={Boolean(
            params.status || params.clientId || params.rail || params.from || params.to,
          )}
          rail={params.rail}
        />
      ) : view === "table" ? (
        <InvoicesTable invoices={ordered} />
      ) : (
        <InvoiceCards invoices={ordered} />
      )}

      {railCut ? (
        <p className="mt-6 text-xs text-read-faint">
          {railCut.shown} de {railCut.of} nesta página no trilho{" "}
          {railLabel[params.rail ?? ""] ?? params.rail} — o recorte de trilho vale
          por página; navegue para ver as demais.
        </p>
      ) : null}

      <Pagination
        page={pageData.page.number}
        totalPages={pageData.page.totalPages}
        totalElements={pageData.page.totalElements}
        makeHref={(page) => makeHref({ page: String(page) })}
      />
    </div>
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
  const total = `${totalElements} fatura${totalElements === 1 ? "" : "s"} no total`;

  if (totalPages <= 1) {
    return <p className="mt-6 text-xs text-read-faint">{total}</p>;
  }

  const step =
    "glass inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium tracking-[0.08em] uppercase hover:bg-white/12";

  return (
    <nav className="mt-8 flex flex-wrap items-center gap-4" aria-label="Paginação">
      {page > 0 ? (
        <Link href={makeHref(page - 1)} className={step}>
          <ChevronLeft className="size-3.5" aria-hidden />
          Anterior
        </Link>
      ) : null}
      <span className="readout text-sm text-read-soft">
        Página {page + 1} de {totalPages}
      </span>
      {page + 1 < totalPages ? (
        <Link href={makeHref(page + 1)} className={step}>
          Próxima
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
      <span className="text-xs text-read-faint">{total}</span>
    </nav>
  );
}

function EmptyState({ hasFilters, rail }: { hasFilters: boolean; rail?: string }) {
  const futureRail = rail === "BOLETO" || rail === "CARD";
  return (
    <div className="glass rounded-xl px-6 py-16 text-center">
      <p className="text-2xl font-semibold tracking-[-0.01em]">
        {futureRail ? "Trilho em preparo" : "Nada nesta leitura"}
      </p>
      <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-read-soft">
        {futureRail
          ? `Hoje só o Pix executa. ${railLabel[rail ?? ""] ?? ""} já existe como vocabulário do sistema (etiqueta, filtro, coluna) e entra nos próximos passos.`
          : hasFilters
            ? "Nenhuma fatura bate com esses filtros. Limpe os filtros ou mude o período."
            : "Nenhuma fatura ainda. Abra um cliente, escolha um contrato e gere a próxima fatura."}
      </p>
    </div>
  );
}
