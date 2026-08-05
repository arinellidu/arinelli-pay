export function PageHeader({ title, note, readout }: { title: string; note?: string; readout?: React.ReactNode }) {
  return (
    <header className="surface-toolbar surface-frame surface-scan mb-7 rounded-xl px-5 py-6 sm:px-6">
      <div className="relative z-1 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="title-shine text-[clamp(2.25rem,5vw,3.75rem)] leading-[.96] font-semibold tracking-[-0.04em]">{title}</h1>
          {note ? <p className="mt-4 max-w-[72ch] text-sm leading-relaxed text-read-soft">{note}</p> : null}
        </div>
        {readout ? <div className="shrink-0">{readout}</div> : null}
      </div>
    </header>
  );
}

export function Readout({ label, value, tone = "read" }: { label: string; value: React.ReactNode; tone?: "read" | "signal" | "alert" }) {
  const toneClass = tone === "signal" ? "text-signal-bright" : tone === "alert" ? "text-alert" : "text-read";
  return <div className="min-w-[5.5rem]"><p className="text-[9px] font-semibold tracking-[0.18em] text-read-faint uppercase">{label}</p><p className={`readout mt-1.5 text-lg leading-none ${toneClass}`}>{value}</p></div>;
}

export function ReadoutStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="surface-well relative z-1 flex flex-wrap items-start gap-x-8 gap-y-3 rounded-lg border-l-2 border-l-signal-bright/70 px-4 py-3.5 shadow-[inset_4px_0_20px_-6px_rgb(229_184_46/35%)]">
      {children}
    </div>
  );
}
