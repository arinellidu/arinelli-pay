"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Money } from "@/components/money";
import { Lamp } from "@/components/status-badge";
import { money } from "@/lib/format";
import { announcePoll, announceSettlement, holdPending } from "@/lib/signal";

const BFF = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:3001";

interface ChargeState {
  id: number;
  status: string;
  emv: string | null;
}

/**
 * "Cobrar via Pix": a Idempotency-Key nasce AQUI (uuid do client) e viaja
 * intacta até o uq_charges_idem do core (I1). Polling de 3s enquanto a cobrança
 * está PENDENTE; cada batida acende o campo de fundo e a liquidação — que só
 * vem de webhook processado (I7) — dispara a varredura da tela.
 */
export function PixChargeButton({
  invoiceId,
  invoiceStatus,
  amount,
  clientName,
  existingCharge,
}: {
  invoiceId: number;
  invoiceStatus: string;
  amount: number;
  clientName: string;
  existingCharge: ChargeState | null;
}) {
  const router = useRouter();
  const [charge, setCharge] = useState<ChargeState | null>(existingCharge);
  const [paid, setPaid] = useState(invoiceStatus === "PAID");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // uuid nasce no primeiro clique (lazy: puro no render) e fica estável para replays
  const keyRef = useRef<string | null>(null);
  // a liquidação pode tirar a fatura da listagem filtrada; se o painel estiver
  // aberto, o refresh espera o usuário fechar — senão o selo somia junto com o card
  const deferredRefresh = useRef(false);

  const pending = charge?.status === "PENDING" && !paid;

  const closeDialog = useCallback(() => {
    setOpen(false);
    if (deferredRefresh.current) {
      deferredRefresh.current = false;
      router.refresh();
    }
  }, [router]);

  // enquanto houver cobrança viva nesta tela, o campo de fundo fica em vigília
  useEffect(() => {
    if (!pending) return;
    return holdPending();
  }, [pending]);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => {
      void (async () => {
        try {
          const response = await fetch(`${BFF}/bff/invoices/${invoiceId}/status`);
          if (!response.ok) return;
          const status = (await response.json()) as {
            status: string;
            charge: { status: string } | null;
          };
          announcePoll();
          if (status.charge && charge) {
            setCharge({ ...charge, status: status.charge.status });
          }
          if (status.status === "PAID") {
            setPaid(true);
            announceSettlement();
            if (open) {
              deferredRefresh.current = true;
            } else {
              router.refresh();
            }
          }
        } catch {
          // rede piscou: a próxima batida do polling tenta de novo
        }
      })();
    }, 3000);
    return () => clearInterval(timer);
  }, [pending, invoiceId, charge, router, open]);

  const createCharge = useCallback(async () => {
    setBusy(true);
    setError(null);
    keyRef.current ??= globalThis.crypto?.randomUUID?.() ?? `${invoiceId}-${Date.now()}`;
    try {
      const response = await fetch(`${BFF}/bff/charges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": keyRef.current,
        },
        body: JSON.stringify({ invoiceId, rail: "PIX" }),
      });
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as { detail?: string } | null;
        throw new Error(problem?.detail ?? `Falha ao cobrar (HTTP ${response.status})`);
      }
      const created = (await response.json()) as ChargeState;
      setCharge(created);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao cobrar");
    } finally {
      setBusy(false);
    }
  }, [invoiceId]);

  const chargeable = invoiceStatus === "OPEN" || invoiceStatus === "OVERDUE";
  const showActions = !paid && chargeable;
  // paga com o painel aberto: ele fica de pé para o selo cair na frente de quem
  // está olhando — fechar é gesto do usuário, nunca do estado
  if (!showActions && !open) {
    return null;
  }

  return (
    <>
      {!showActions ? null : charge ? (
        <Button variant="glass" size="sm" onClick={() => setOpen(true)} disabled={!charge.emv}>
          <QrCode data-icon="inline-start" />
          Ver QR Pix
        </Button>
      ) : (
        <Button variant="signal" size="sm" onClick={() => void createCharge()} disabled={busy}>
          {busy ? "Cobrando…" : "Cobrar via Pix"}
        </Button>
      )}
      {error ? (
        <p className="mt-1.5 text-xs text-alert" role="alert">
          {error}
        </p>
      ) : null}
      {charge?.emv ? (
        <PixDialog
          open={open}
          onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}
          invoiceId={invoiceId}
          amount={amount}
          clientName={clientName}
          emv={charge.emv}
          settled={paid || charge.status === "SETTLED"}
        />
      ) : null}
    </>
  );
}

/**
 * O painel de cobrança é o instrumento aberto: leitura do valor, o QR como
 * saída impressa do aparelho e a linha de estado ao vivo. Quando o webhook
 * liquida, o selo cai sobre a leitura e a tela inteira é varrida uma vez.
 */
function PixDialog({
  open,
  onOpenChange,
  invoiceId,
  amount,
  clientName,
  emv,
  settled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: number;
  amount: number;
  clientName: string;
  emv: string;
  settled: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const invoiceNumber = String(invoiceId).padStart(4, "0");

  // ref de callback em vez de efeito: o popup do Base UI só entra no DOM
  // depois da transição de abertura, e o efeito rodaria com o canvas ainda nulo
  const paintQr = useCallback(
    (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      // o QR sai numa chapa clara: código legível por leitor real, e a única
      // superfície de papel do aparelho
      void QRCode.toCanvas(canvas, emv, {
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 5,
        width: 220,
        color: { dark: "#080808", light: "#f1f1ee" },
      });
      canvas.style.maxWidth = "100%";
      canvas.style.height = "auto";
    },
    [emv],
  );

  const copy = async () => {
    await navigator.clipboard.writeText(emv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="surface-panel surface-frame surface-scan surface-dialog glass-deep rounded-xl p-0 sm:max-w-md">
        <div className="surface-well relative flex flex-col gap-1.5 border-b border-white/8 px-5 py-3.5 pr-12 sm:flex-row sm:items-center sm:gap-3">
          <DialogTitle className="readout text-[13px] font-medium tracking-[0.18em] whitespace-nowrap uppercase">
            Cobrança Pix
          </DialogTitle>
          <span
            role="status"
            className="readout inline-flex items-center gap-2 text-[11px] tracking-[0.14em] whitespace-nowrap uppercase sm:ml-auto"
          >
            <Lamp state={settled ? "on" : "live"} />
            <span className={settled ? "text-signal-bright" : "text-read-soft"}>
              {settled ? "Liquidada" : "Aguardando pagamento"}
            </span>
          </span>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <p className="readout text-[11px] tracking-[0.16em] text-read-faint uppercase">
              Fatura {invoiceNumber} · {clientName}
            </p>
            <div className="relative mt-2 flex items-end justify-between gap-4">
              <motion.span
                animate={{ color: settled ? "#ffd966" : "#f1f1ee" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Money value={amount} className="text-[2.5rem] leading-none font-medium" />
              </motion.span>
              <AnimatePresence>
                {settled ? <SettlementSeal amount={amount} /> : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            <div className="w-full max-w-60 rounded-lg bg-read p-2.5 shadow-[0_18px_40px_-24px_rgb(0_0_0/90%)]">
              <canvas
                ref={paintQr}
                role="img"
                aria-label={`QR Pix da fatura ${invoiceNumber} — ${money(amount)}`}
                className="mx-auto block h-auto w-full max-w-full"
              />
            </div>
            <DialogDescription className="max-w-[42ch] text-center text-xs text-read-soft">
              Escaneie no app do banco ou use o copia‑e‑cola. A fatura liquida
              sozinha quando o webhook confirmar — o front não decide isso.
            </DialogDescription>
          </div>

          <div>
            <p className="readout mb-1.5 text-[10px] tracking-[0.2em] text-read-faint uppercase">
              Pix copia-e-cola
            </p>
            <code className="block max-h-20 overflow-y-auto rounded-md border border-white/8 bg-black/35 p-2.5 font-mono text-[11px] leading-relaxed break-all text-read-soft">
              {emv}
            </code>
          </div>

          <Button variant="signal" className="h-9 w-full" onClick={() => void copy()}>
            {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copied ? "Código copiado" : "Copiar código"}
          </Button>
          <span role="status" className="sr-only">
            {copied ? "Código Pix copiado" : ""}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** O único momento coreografado: a chegada da liquidação. */
function SettlementSeal({ amount }: { amount: number }) {
  return (
    <motion.span
      className="relative inline-flex shrink-0 items-center gap-2 rounded-md border border-signal-bright/45 bg-signal/18 px-2.5 py-1.5 shadow-[0_0_24px_-4px_rgb(229_184_46/45%),inset_0_1px_0_rgb(255_217_102/18%)]"
      initial={{ opacity: 0, scale: 0.72, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 24, mass: 0.7 }}
      aria-label={`Paga — ${money(amount)}`}
    >
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-md border border-signal-bright"
        initial={{ opacity: 0.65, scale: 1 }}
        animate={{ opacity: 0, scale: 1.9 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      />
      <Check className="size-4 text-signal-bright" aria-hidden />
      <span className="readout text-xs font-medium tracking-[0.18em] text-signal-bright uppercase">
        Paga
      </span>
    </motion.span>
  );
}
