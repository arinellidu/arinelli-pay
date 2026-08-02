import type { Metadata } from "next";
import { Archivo, Azeret_Mono } from "next/font/google";
import "./globals.css";
import { Masthead } from "@/components/masthead";
import { SignalField } from "@/components/signal-field";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const azeret = Azeret_Mono({ variable: "--font-azeret", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Arinelli Pay", template: "%s — Arinelli Pay" },
  description:
    "Cobrança multi-trilho (Pix · boleto · cartão) com liquidação real por webhook — demo técnica.",
};

const CONTRACT = `<!--
THESIS: a cobranca lida como instrumento de medicao — o painel mostra um sinal
vivo vindo do backend, e recusa o dashboard de sidebar + cards de KPI.
OWN-WORLD: chassi #07090B sob campo de fosforo WebGL; paineis de vidro de
cobertura (blur 20px, aresta 1px de luz, aro de sombra); acento fosforo
#00DC5A; Archivo para interface, Azeret Mono para toda leitura de medicao;
icones lucide em traco unico; shadcn/ui (base-nova) como substrato.
STORY: o avaliador le a carteira, cobra via Pix, e ve a tela inteira reagir
quando o webhook liquida — o movimento prova que o sistema respondeu.
FIRST VIEWPORT (/invoices): masthead de vidro fixo; FATURAS com a regua de
estado do periodo ao lado; barra de filtros em vidro; grade de paineis com o
valor em leitura mono grande, lampada de cobranca viva e UMA acao de fosforo.
FORM: glassmorphism + WebGL pinado pelo brief do usuario (a direcao pinada
vence o sorteio); rendicao "instrumento de sinal".
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.
-->`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${archivo.variable} ${azeret.variable} h-full`}
    >
      {/* o body NÃO pode ter fundo: o chassi é pintado no <html> e o campo
          WebGL (z-index -10) precisa ficar entre os dois */}
      <body className="flex min-h-full flex-col text-read antialiased">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <SignalField />
        <Masthead />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
          {children}
        </main>

        <footer className="mt-16 border-t border-white/8">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs text-read-faint sm:px-6">
            <span>
              Arinelli Pay — demo técnica. Clientes e contratos são dados
              sintéticos; a liquidação é real, via webhook assinado + outbox.
            </span>
            <span className="readout tracking-[0.18em] uppercase">
              Pix · Boleto · Cartão
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
