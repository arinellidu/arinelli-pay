import Link from "next/link";

/** O gesto nativo do mundo: bitmap alto (cards) ⇄ texto fino denso (tabela). */
export function ViewToggle({
  view,
  makeHref,
}: {
  view: "cards" | "table";
  makeHref: (view: "cards" | "table") => string;
}) {
  return (
    <div className="inline-flex border-2 border-ink" role="group" aria-label="Modo de exibição">
      <ToggleLink active={view === "cards"} href={makeHref("cards")}>
        CARDS
      </ToggleLink>
      <ToggleLink active={view === "table"} href={makeHref("table")}>
        TABELA
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
      aria-current={active ? "true" : undefined}
      className={`px-3 py-1 text-xs font-bold tracking-[0.16em] ${
        active ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-paper-deep"
      }`}
    >
      {children}
    </Link>
  );
}
