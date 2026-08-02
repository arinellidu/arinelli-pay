"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

const BFF = process.env.NEXT_PUBLIC_BFF_URL ?? "http://localhost:3001";

interface ChargeState {
  id: number;
  status: string;
  emv: string | null;
}

/**
 * "Cobrar via Pix" (P07): a Idempotency-Key nasce AQUI (uuid do client) e viaja
 * intacta até o uq_charges_idem do core. Polling de 3s enquanto PENDENTE; o
 * carimbo vira PAGA sem reload quando o webhook liquida (I7 — nada é simulado).
 */
export function PixChargeButton({
  invoiceId,
  invoiceStatus,
  existingCharge,
}: {
  invoiceId: number;
  invoiceStatus: string;
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

  const pending = charge?.status === "PENDING" && !paid;

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
          if (status.charge && charge) {
            setCharge({ ...charge, status: status.charge.status });
          }
          if (status.status === "PAID") {
            setPaid(true);
            router.refresh();
          }
        } catch {
          // rede piscou: a próxima batida do polling tenta de novo
        }
      })();
    }, 3000);
    return () => clearInterval(timer);
  }, [pending, invoiceId, charge, router]);

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
  // paga com modal aberto: o modal fica de pé para o carimbo PAGA aparecer —
  // fechar é gesto do usuário, nunca do estado
  if (!showActions && !open) {
    return null;
  }

  return (
    <>
      {!showActions ? null : charge ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!charge.emv}
          className="px-corners border-2 border-ink bg-paper px-3 py-1.5 text-xs font-bold tracking-[0.14em] hover:bg-ink hover:text-paper disabled:opacity-50"
        >
          VER QR PIX
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void createCharge()}
          disabled={busy}
          className="px-corners bg-synth px-3 py-1.5 text-xs font-bold tracking-[0.14em] text-ink hover:bg-synth-deep disabled:opacity-50"
        >
          {busy ? "COBRANDO…" : "COBRAR VIA PIX"}
        </button>
      )}
      {error ? <p className="mt-1 text-xs text-alarm">{error}</p> : null}
      {open && charge?.emv ? (
        <PixModal
          emv={charge.emv}
          paid={paid}
          chargeStatus={charge.status}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function PixModal({
  emv,
  paid,
  chargeStatus,
  onClose,
}: {
  emv: string;
  paid: boolean;
  chargeStatus: string;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      void QRCode.toCanvas(canvasRef.current, emv, {
        errorCorrectionLevel: "M",
        margin: 2,
        scale: 6,
        color: { dark: "#0a0a0a", light: "#f5f3ec" },
      });
    }
  }, [emv]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    await navigator.clipboard.writeText(emv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Cobrança Pix"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm border-4 border-ink bg-paper"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-4 border-ink px-4 py-2">
          <span className="bitmap text-step-24">PIX</span>
          {paid || chargeStatus === "SETTLED" ? (
            <span className="stamp stamp-in text-step-16 text-stamp-paid">PAGA</span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium tracking-wide">
              <span className="blink-block inline-block h-3 w-3 bg-synth-deep" aria-hidden />
              AGUARDANDO PAGAMENTO
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="bitmap text-step-24 leading-none hover:text-alarm"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 p-5">
          <canvas ref={canvasRef} className="pixelated border-2 border-ink" />
          <p className="text-center text-xs text-ink-soft">
            Escaneie no app do banco ou use o copia-e-cola. A fatura carimba
            sozinha quando o webhook liquidar.
          </p>
          <div className="w-full">
            <p className="mb-1 text-[10px] font-bold tracking-[0.2em] text-ink-soft">
              PIX COPIA-E-COLA
            </p>
            <code className="block max-h-20 overflow-y-auto break-all border border-ink/40 bg-paper-deep p-2 font-mono text-[10px] leading-snug">
              {emv}
            </code>
          </div>
          <button
            type="button"
            onClick={() => void copy()}
            className="px-corners w-full bg-synth px-3 py-2 text-sm font-bold tracking-[0.14em] text-ink hover:bg-synth-deep"
          >
            {copied ? "COPIADO ✓" : "COPIAR CÓDIGO"}
          </button>
        </div>
      </div>
    </div>
  );
}
