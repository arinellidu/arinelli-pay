"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EditableCellProps {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
  className?: string;
}

/** Valor de célula com botão de edição ao lado — abre o formulário da linha. */
export function EditableCell({ label, onEdit, children, className }: EditableCellProps) {
  return (
    <div className={cn("group/cell flex min-w-0 items-start gap-1", className)}>
      <div className="min-w-0 flex-1 py-0.5">{children}</div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-7 shrink-0 text-read-faint opacity-70 transition-opacity hover:text-signal md:opacity-0 md:group-hover/cell:opacity-100 md:focus-visible:opacity-100"
        onClick={onEdit}
        aria-label={`Editar ${label}`}
      >
        <Pencil className="size-3.5" aria-hidden />
      </Button>
    </div>
  );
}
