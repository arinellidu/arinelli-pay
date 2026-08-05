"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel } from "@/components/people/form-field";
import { cadastrarCliente } from "@/lib/portfolio-client";
import { documentMask } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ClientCandidate {
  key: string;
  document: string;
  documentType: "CPF" | "CNPJ";
  name: string;
  email?: string;
}

export function ClientForm({ candidates }: { candidates: ClientCandidate[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const candidate = useMemo(
    () => candidates.find((item) => item.key === selected),
    [candidates, selected],
  );
  const personOptions = useMemo(
    () => [
      { value: "", label: "Selecione por nome ou documento" },
      ...candidates.map((item) => ({
        value: item.key,
        label: `${item.name} · ${item.documentType} ${documentMask(item.document)}`,
      })),
    ],
    [candidates],
  );

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setSelected("");
      setError("");
    }
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!candidate) {
      setError("Selecione um CPF ou CNPJ cadastrado.");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await cadastrarCliente({
      document: candidate.document,
      name: candidate.name,
      email: candidate.email,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    close(false);
    router.push(`/clients/${result.id}`);
    router.refresh();
  }

  return (
    <>
      <Button variant="glass" onClick={() => setOpen(true)} disabled={candidates.length === 0}>
        <UserRoundPlus data-icon="inline-start" />
        Novo cliente
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="surface-panel surface-frame surface-scan surface-dialog glass-deep rounded-xl p-0 sm:max-w-lg">
          <div className="border-b border-white/10 px-5 py-3.5 pr-12">
            <DialogTitle className="readout text-[13px] font-medium tracking-[0.18em] uppercase">
              Novo cliente
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-read-soft">
              Transforme uma pessoa já cadastrada em cliente da carteira.
            </DialogDescription>
          </div>

          <form onSubmit={(event) => void submit(event)} className="space-y-4 px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="client-person">Pessoa cadastrada</FieldLabel>
              <Select
                items={personOptions}
                value={selected}
                onValueChange={(value) => {
                  setSelected(value ?? "");
                  setError("");
                }}
              >
                <SelectTrigger
                  id="client-person"
                  aria-invalid={error ? true : undefined}
                  className={cn(
                    "h-9 w-full bg-white/4 text-sm text-read hover:bg-white/8",
                    error ? "border-alert/70" : "border-input",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="surface-panel surface-frame surface-scan glass-deep rounded-lg border-signal/15">
                  {personOptions.map((option) => (
                    <SelectItem key={option.value || "empty"} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {candidate ? (
              <div className="surface-well rounded-lg border border-signal/10 px-3 py-3 text-sm">
                <p className="font-medium">{candidate.name}</p>
                <p className="readout mt-1 text-xs text-read-soft">
                  {candidate.documentType} · {documentMask(candidate.document)}
                </p>
                {candidate.email ? (
                  <p className="mt-1 text-xs text-read-soft">{candidate.email}</p>
                ) : null}
              </div>
            ) : null}

            {error ? <p role="alert" className="text-sm text-alert">{error}</p> : null}

            <div className="flex items-center justify-end gap-4 border-t border-white/8 pt-4">
              <DialogClose className="text-xs text-read-faint underline decoration-white/20 underline-offset-4 hover:text-read">
                Cancelar
              </DialogClose>
              <Button type="submit" variant="glass" disabled={submitting || !candidate}>
                {submitting ? "Cadastrando…" : "Cadastrar cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
