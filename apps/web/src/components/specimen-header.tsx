/** Cabeçalho-assinatura do mundo: a mesma palavra em degraus de tamanho,
    do bitmap gigante até dissolver em cinza fino — como num specimen. */
export function SpecimenHeader({ word, note }: { word: string; note?: string }) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-baseline gap-x-4">
        <h1 className="bitmap text-step-64 sm:text-[5rem] leading-none">{word}</h1>
        <span className="bitmap text-step-32 text-ink-soft" aria-hidden>
          {word}
        </span>
        <span className="bitmap hidden text-step-16 text-ink-soft/70 sm:inline" aria-hidden>
          {word}
        </span>
        <span className="hidden text-[8px] tracking-widest text-ink-soft/50 sm:inline" aria-hidden>
          {word}
        </span>
      </div>
      {note ? <p className="mt-2 max-w-[65ch] text-sm text-ink-soft">{note}</p> : null}
      <div className="rule-dotted mt-4" />
    </div>
  );
}
