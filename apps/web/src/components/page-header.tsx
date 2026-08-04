export function PageHeader({ title, note, readout }: { title: string; note?: string; readout?: React.ReactNode }) {
  return (
    <header className="mb-7 border-b border-white/10 pb-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(2.25rem,5vw,3.75rem)] leading-[.96] font-semibold tracking-[-0.04em]">{title}</h1>
          {note ? <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-read-soft">{note}</p> : null}
        </div>
        {readout ? <div className="shrink-0">{readout}</div> : null}
      </div>
    </header>
  );
}

export function Readout({ label, value, tone = "read" }: { label: string; value: React.ReactNode; tone?: "read" | "signal" | "alert" }) {
  const toneClass = tone === "signal" ? "text-signal" : tone === "alert" ? "text-alert" : "text-read";
  return <div className="min-w-[5.5rem]"><p className="text-[9px] font-semibold tracking-[0.18em] text-read-faint uppercase">{label}</p><p className={`readout mt-1.5 text-lg leading-none ${toneClass}`}>{value}</p></div>;
}

export function ReadoutStrip({ children }: { children: React.ReactNode }) {
  return <div className="glass flex flex-wrap items-start gap-x-8 gap-y-3 rounded-lg border-l-signal/55 px-4 py-3.5">{children}</div>;
}
