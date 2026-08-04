"use client";

import type { UseFormRegisterReturn } from "react-hook-form";
import { cn } from "@/lib/utils";

/** Mesmo material dos campos de filtro (white/4), com a borda em alerta quando o campo reprova. */
export const fieldControl = (invalid: boolean) =>
  cn(
    "h-9 w-full rounded-lg border bg-white/4 px-2.5 text-sm text-read outline-none transition-colors placeholder:text-read-soft/80 hover:bg-white/8 focus-visible:border-ring",
    invalid ? "border-alert/70" : "border-input",
  );

export function FieldLabel({
  htmlFor,
  children,
  optional,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="readout text-[10px] tracking-[0.2em] text-read-faint uppercase"
    >
      {children}
      {optional ? (
        <span className="ml-1.5 tracking-[0.08em] text-read-faint/90 normal-case">
          · opcional
        </span>
      ) : null}
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs leading-snug text-alert">
      {message}
    </p>
  );
}

/**
 * Campo de texto do formulário: rótulo mono em cima, erro embaixo, máscara de
 * digitação opcional. A máscara reescreve o valor ANTES de o react-hook-form
 * ler o evento — a validação recebe o texto mascarado e o schema tira a máscara.
 */
export function TextField({
  label,
  optional,
  error,
  registration,
  mask,
  className,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  optional?: boolean;
  error?: string;
  registration: UseFormRegisterReturn;
  mask?: (value: string) => string;
}) {
  const id = inputProps.id ?? registration.name;
  const errorId = `${id}-erro`;

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <FieldLabel htmlFor={id} optional={optional}>
        {label}
      </FieldLabel>
      <input
        {...inputProps}
        id={id}
        name={registration.name}
        ref={registration.ref}
        onBlur={registration.onBlur}
        onChange={(event) => {
          if (mask) {
            event.target.value = mask(event.target.value);
          }
          void registration.onChange(event);
        }}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={fieldControl(Boolean(error))}
      />
      <FieldError id={errorId} message={error} />
    </div>
  );
}

/** Bloco do formulário: rótulo de seção sobre hairline, campos dentro. */
export function FormSection({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-white/8 pt-4">
      <p className="readout text-[10px] tracking-[0.2em] text-read-faint uppercase">
        {label}
        {optional ? (
          <span className="ml-1.5 tracking-[0.08em] normal-case">· opcional</span>
        ) : null}
      </p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
