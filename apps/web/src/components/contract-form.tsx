"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel, fieldControl } from "@/components/people/form-field";
import { cadastrarContrato } from "@/lib/portfolio-client";
import { documentMask } from "@/lib/format";
import type { Client } from "@/lib/bff";

export function ContractForm({
  clients,
  initialClientId,
  presentation = "dialog",
}: {
  clients: Client[];
  initialClientId?: number;
  presentation?: "dialog" | "panel";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(initialClientId ? String(initialClientId) : "");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDay, setBillingDay] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const prefix = presentation === "panel" ? "panel-contract" : "dialog-contract";
  const clientOptions = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [clients]);

  function reset() {
    setClientId(initialClientId ? String(initialClientId) : "");
    setTitle(""); setAmount(""); setBillingDay(""); setError("");
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
    setSubmitting(true); setError("");
    const result = await cadastrarContrato({ clientId: Number(clientId), title: title.trim(), amount: normalizedAmount, billingDay: day });
    setSubmitting(false);
    if (!result.ok) { setError(result.message); return; }
    if (presentation === "dialog") close(false); else reset();
    router.push(`/contracts/${result.id}`);
    router.refresh();
  }

  const form = (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={`${prefix}-client`}>Cliente da carteira</FieldLabel>
        <select
          id={`${prefix}-client`}
          className={fieldControl(Boolean(error && !clientId))}
          value={clientId}
          onChange={(event) => { setClientId(event.target.value); setError(""); }}
          disabled={Boolean(initialClientId)}
          aria-invalid={error && !clientId ? true : undefined}
        >
          <option value="">Selecione o cliente</option>
          {clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name} · {client.documentType} {documentMask(client.document)}</option>)}
        </select>
        <p className="text-[11px] leading-relaxed text-read-faint">Somente clientes cadastrados podem receber um contrato.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={`${prefix}-title`}>Título</FieldLabel>
        <input id={`${prefix}-title`} className={fieldControl(false)} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} placeholder="Ex.: Assessoria mensal" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`${prefix}-amount`}>Valor mensal</FieldLabel>
          <input id={`${prefix}-amount`} className={fieldControl(false)} value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0,00" />
        </div>
        <div className="flex flex-col gap-1.5">
          <FieldLabel htmlFor={`${prefix}-day`}>Dia</FieldLabel>
          <input id={`${prefix}-day`} className={fieldControl(false)} value={billingDay} onChange={(event) => setBillingDay(event.target.value.replace(/\D/g, "").slice(0, 2))} inputMode="numeric" placeholder="1–28" />
        </div>
      </div>
      {error ? <p role="alert" className="text-sm text-alert">{error}</p> : null}
      <div className="flex items-center justify-end gap-4 border-t border-white/8 pt-4">
        {presentation === "dialog" ? <DialogClose className="text-xs text-read-faint underline decoration-white/20 underline-offset-4 hover:text-read">Cancelar</DialogClose> : null}
        <Button type="submit" variant="signal" className={presentation === "panel" ? "w-full" : ""} disabled={submitting || clients.length === 0}>
          <FilePlus2 data-icon="inline-start" /> {submitting ? "Criando…" : "Criar contrato"}
        </Button>
      </div>
    </form>
  );

  if (presentation === "panel") {
    return (
      <aside className="surface-panel surface-frame surface-scan rounded-xl border-t-signal/45 p-5 lg:sticky lg:top-[92px]" aria-labelledby="contract-panel-title">
        <h2 id="contract-panel-title" className="text-xl font-semibold tracking-[-0.025em]">Cadastrar contrato</h2>
        <p className="mt-2 mb-5 text-xs leading-relaxed text-read-soft">Associe um cliente e defina a próxima recorrência.</p>
        {form}
      </aside>
    );
  }

  return (
    <>
      <Button variant="glass" onClick={() => setOpen(true)} disabled={clients.length === 0}><FilePlus2 data-icon="inline-start" /> Novo contrato</Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="surface-panel surface-frame surface-scan surface-dialog glass-deep rounded-xl p-0 sm:max-w-lg">
          <div className="border-b border-white/10 px-5 py-4 pr-12">
            <DialogTitle className="text-lg font-semibold tracking-[-0.02em]">Novo contrato</DialogTitle>
            <DialogDescription className="mt-1 text-xs text-read-soft">Defina o cliente, o valor recorrente e o dia de vencimento.</DialogDescription>
          </div>
          <div className="px-5 py-5">{form}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
