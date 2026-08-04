import type { Metadata } from "next";
import { Archivo, Azeret_Mono } from "next/font/google";
import "./globals.css";
import { Masthead } from "@/components/masthead";
import { SignalField } from "@/components/signal-field";

const archivo = Archivo({ variable: "--font-archivo", subsets: ["latin"] });
const azeret = Azeret_Mono({ variable: "--font-azeret", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Arinelli Pay", template: "%s — Arinelli Pay" },
  description: "Cobrança multi-trilho com liquidação real por webhook.",
};

const CONTRACT = `<!--
THESIS: Registro Executivo — uma câmara de compensação contemporânea que troca
o dashboard genérico por ledgers densos, decisões claras e precisão editorial.
OWN-WORLD: preto #080808, grafite #151515, cinza frio #D8D9D6 e ouro funcional
#C5A461; vidro executivo com reflexo frio; Archivo na interface, Azeret Mono
somente em dados; lucide + shadcn/Base UI + Tailwind 4. Seed: 852f640c.
STORY: o operador cadastra pessoas, promove documentos a clientes, associa
contratos e acompanha a liquidação real sem perder o contexto do registro.
FIRST VIEWPORT (/invoices): marca e navegação compactas; título e métricas na
mesma linha; filtros operacionais; ledger horizontal com ações Pix visíveis.
FORM: composição aprovada A+B — registro horizontal com painel persistente de
cadastro em contratos; glassmorphism disciplinado, Motion e varredura WebGL.
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and DESIGN.md.
-->`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`dark ${archivo.variable} ${azeret.variable} h-full`}>
      <body className="flex min-h-full flex-col text-read antialiased">
        <div hidden dangerouslySetInnerHTML={{ __html: CONTRACT }} />
        <SignalField />
        <Masthead />
        <main className="relative mx-auto w-full max-w-[1440px] flex-1 px-4 py-8 pb-24 sm:px-6 sm:py-10 sm:pb-12 lg:px-8">
          {children}
        </main>
        <footer className="mt-16 border-t border-white/8">
          <div className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-xs text-read-faint sm:px-6 lg:px-8">
            <span>Arinelli Pay — ambiente técnico com dados sintéticos e liquidação real via webhook.</span>
            <span className="readout tracking-[0.16em] uppercase">Pix · Boleto · Cartão</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
