import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <div className="glass rounded-xl px-6 py-16 text-center">
      <p className="text-2xl font-semibold tracking-[-0.01em]">Fora de escala</p>
      <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-read-soft">
        Esta página não existe — ou o identificador de cliente, contrato ou fatura foi
        digitado errado.
      </p>
      <Link
        href="/invoices"
        className="glass mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium tracking-[0.08em] uppercase hover:bg-white/12"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Voltar às faturas
      </Link>
    </div>
  );
}
