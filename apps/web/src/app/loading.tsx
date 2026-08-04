/** Transição de rota com o indicador operacional compartilhado. */
export default function Loading() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-28 text-read-soft"
    >
      <span className="lamp inline-block size-2 rounded-full bg-signal" aria-hidden />
      <span className="readout text-sm tracking-[0.2em] uppercase">Atualizando registros</span>
    </div>
  );
}
