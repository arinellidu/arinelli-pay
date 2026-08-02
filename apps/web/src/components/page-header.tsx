/**
 * Cabeçalho de painel: o nome da tela em caixa grande e, na mesma linha de
 * base, a régua de leituras do aparelho (contagens que vêm do backend).
 * A nota explica o que a tela mede — nunca é kicker acima do título.
 */
export function PageHeader({
  title,
  note,
  readout,
}: {
  title: string;
  note?: string;
  readout?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {/* no mobile a leitura desce para depois da nota; em ≥sm ela sobe para a
          mesma linha de base do título */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-8">
        <h1 className="order-1 text-[clamp(2.5rem,7vw,4rem)] leading-[0.95] font-semibold tracking-[-0.02em] uppercase">
          {title}
        </h1>
        {note ? (
          <p className="order-2 max-w-[68ch] text-sm leading-relaxed text-read-soft sm:order-3 sm:mt-4 sm:w-full">
            {note}
          </p>
        ) : null}
        {readout ? <div className="order-3 sm:order-2 sm:pb-1">{readout}</div> : null}
      </div>
      <div className="hairline mt-6" />
    </header>
  );
}

/** Uma leitura da régua: rótulo miúdo em cima, medição em mono embaixo. */
export function Readout({
  label,
  value,
  tone = "read",
}: {
  label: string;
  value: React.ReactNode;
  tone?: "read" | "signal" | "alert";
}) {
  const toneClass =
    tone === "signal"
      ? "text-signal"
      : tone === "alert"
        ? "text-alert"
        : "text-read";
  return (
    <div className="min-w-[4.5rem]">
      <p className="text-[10px] font-medium tracking-[0.2em] text-read-faint uppercase">
        {label}
      </p>
      <p className={`readout mt-1 text-lg leading-none ${toneClass}`}>{value}</p>
    </div>
  );
}

export function ReadoutStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="glass flex flex-wrap items-start gap-x-8 gap-y-3 rounded-lg px-4 py-3">
      {children}
    </div>
  );
}
