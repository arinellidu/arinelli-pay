"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Dobra de filtros no mobile: fechada por padrão para o primeiro viewport
 * carregar a carteira, não um formulário. Em ≥sm não existe dobra — o form
 * fica sempre aberto.
 */
export function FilterFold({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-w-0 flex-1">
      <Button
        variant="glass"
        size="sm"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="sm:hidden"
      >
        <SlidersHorizontal data-icon="inline-start" />
        Filtros
      </Button>
      <div className={`${open ? "mt-3 block" : "hidden"} sm:mt-0 sm:block`}>{children}</div>
    </div>
  );
}
