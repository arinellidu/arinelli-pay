"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldLabel, fieldControl } from "@/components/people/form-field";
import { cadastrarContrato } from "@/lib/portfolio-client";
import { documentMask } from "@/lib/format";
import type { Client } from "@/lib/bff";

export function ContractForm({ clients, initialClientId }: { clients: Client[]; initialClientId?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(initialClientId ? String(initialClientId) : "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setClientId(initialClientId ? String(initialClientId) : "");
    setTitle("");
    setAmount("");
    setBillingDay("");
    setError("");
  }

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedAmount = Number(amount.replace(",", "."));
    const day = Number(billingDay);
    if (!clientId || title.trim().length < 3 || normalizedAmount <= 0 || day < 1 || day > 28) {
      setError("Revise cliente, título, valor e dia de cobrança (1 a 28).");
      return;
    }
    setSubmitting(true);
    setError("");
    const result = await cadastrarContrato({
      clientId: Number(clientId),
      title: title.trim(),
      amount: normalizedAmount,
      billingDay: day,
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    close(false);
    router.push(`/contracts/${result.id}`);
    router.refresh();
  }

  return (
    <>
      <Button variant="glass" onClick={() => setOpen(true)} disabled={clients.length === 0}>
        <FilePlus2 data-icon="inline-start" />
        Novo contrato
      </Button>

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="glass-deep rounded-xl p-0 sm:max-w-lg">
          <div className="border-b border-white/10 px-5 py-3.5 pr-12">
            <DialogTitle className="readout text-[13px] font-medium tracking-[0.18em] uppercase">
              Novo contrato
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs text-read-soft">
              Defina o cliente, o valor recorrente e o dia de vencimento.
            </DialogDescription>
          </div>

          <form onSubmit={(event) => void submit(event)} className="space-y-4 px-5 py-5">
            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="contract-client">Cliente</FieldLabel>
              <select
                id="contract-client"
                className={fieldControl(false)}
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                disabled={Boolean(initialClientId)}
                autoFocus={!initialClientId}
              >
                <option value="">Selecione o cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name} · {documentMask(client.document)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FieldLabel htmlFor="contract-title">Título</FieldLabel>
              <input id="contract-title" className={fieldControl(false)} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Ex.: Assessoria mensal" autoFocus={Boolean(initialClientId)} />
            </div>

            <div className="grid grid-cols-[1fr_8rem] gap-3">
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="contract-amount">Valor mensal</FieldLabel>
                <input id="contract-amount" className={fieldControl(false)} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel htmlFor="contract-day">Vencimento</FieldLabel>
                <input id="contract-day" className={fieldControl(false)} value={billingDay} onChange={(event) => setBillingDay(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="1 a 28" />
              </div>
            </div>

            {error ? <p role="alert" className="text-sm text-alert">{error}</p> : null}

            <div className="flex items-center justify-end gap-4 border-t border-white/8 pt-4">
              <DialogClose className="text-xs text-read-faint underline decoration-white/20 underline-offset-4 hover:text-read">
                Cancelar
              </DialogClose>
              <Button type="submit" variant="glass" disabled={submitting}>
                {submitting ? "Criando…" : "Criar contrato"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
