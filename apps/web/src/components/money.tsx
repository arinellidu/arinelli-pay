import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Leitura de valor no aparelho: a unidade (R$) fica miúda e recuada, a
 * magnitude domina — como num mostrador, onde a escala não compete com a
 * medição. O texto acessível continua sendo o valor completo.
 */
export function Money({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  const formatted = money(value);
  const gap = formatted.search(/\s/);
  const unit = gap > 0 ? formatted.slice(0, gap) : "R$";
  const amount = gap > 0 ? formatted.slice(gap + 1) : formatted;

  return (
    <span className={cn("readout inline-flex items-baseline", className)} aria-label={formatted}>
      <span className="mr-[0.3em] text-[0.5em] font-medium tracking-[0.06em] text-read-faint">
        {unit}
      </span>
      <span aria-hidden>{amount}</span>
    </span>
  );
}
