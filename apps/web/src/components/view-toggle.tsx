import { LayoutGrid, Rows3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Chave de leitura do aparelho: painéis (leitura larga) ⇄ tabela (leitura densa). */
export function ViewToggle({
  view,
  makeHref,
}: {
  view: "cards" | "table";
  makeHref: (view: "cards" | "table") => string;
}) {
  return (
    <div
      className="glass inline-flex gap-1 rounded-lg p-1"
      role="group"
      aria-label="Modo de exibição"
    >
      <ToggleLink active={view === "cards"} href={makeHref("cards")}>
        <LayoutGrid className="size-3.5" aria-hidden />
        Painéis
      </ToggleLink>
      <ToggleLink active={view === "table"} href={makeHref("table")}>
        <Rows3 className="size-3.5" aria-hidden />
        Tabela
      </ToggleLink>
    </div>
  );
}

function ToggleLink({
  active,
  href,
  children,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium tracking-[0.08em] uppercase transition-colors",
        active
          ? "bg-white/14 text-read shadow-[inset_0_1px_0_0_rgb(255_255_255/16%)]"
          : "text-read-faint hover:bg-white/6 hover:text-read-soft",
      )}
    >
      {children}
    </Link>
  );
}
