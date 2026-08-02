import type { Metadata } from "next";
import { Handjet, Public_Sans } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const handjet = Handjet({
  variable: "--font-handjet",
  subsets: ["latin"],
  weight: ["700"],
});

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Arinelli Pay",
  description:
    "Cobrança multi-trilho (Pix · boleto · cartão) com liquidação real por webhook — demo técnica.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${handjet.variable} ${publicSans.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {/*
        THESIS: cobranca como specimen bitmap — os dados de pagamento expostos como
        tipografia de catalogo; recusa o dashboard sidebar+cards+KPI da categoria.
        OWN-WORLD: papel newsprint #F5F3EC, tinta #0A0A0A, acento sintetico unico
        #00DC5A; display bitmap Handjet em degraus inteiros (64/48/32/24/16),
        texto Public Sans; reguas pontilhadas e halftone como material; botoes de
        canto pixelado; estado carimbado na diagonal.
        STORY: o avaliador ve a carteira, cobra via Pix, o QR pixel abre no modal
        e o carimbo PAGA cai sozinho quando o webhook liquida — nada e mock.
        FIRST VIEWPORT (/invoices): masthead preto com nav; FATURAS em escada
        specimen; regua de filtros; grade de specimen-cards com valor gigante em
        bitmap, carimbo de estado e UMA acao verde COBRAR VIA PIX por fatura aberta.
        FORM: Emigre bitmap specimen — desafiante escolhido pelo usuario sobre o
        sorteado (livro-razao, candidato 4/7); seed ef1cd36a.
        FINISH: unreviewed and undocumented is unfinished; this build ends with
        the finish review, the verdict, and DESIGN.md.
        */}
        <header className="bg-ink text-paper">
          <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between gap-6 px-4 py-3 sm:px-6">
            <Link href="/invoices" className="bitmap text-step-24 tracking-wide">
              ARINELLI&nbsp;PAY
            </Link>
            <nav className="flex items-baseline gap-1 text-sm font-medium">
              <NavLink href="/clients">CLIENTES</NavLink>
              <NavLink href="/invoices">FATURAS</NavLink>
            </nav>
          </div>
          <div className="halftone-fine h-2 w-full bg-paper" aria-hidden />
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>

        <footer className="mt-12 border-t-4 border-ink">
          <div className="halftone-fine h-2 w-full" aria-hidden />
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-baseline justify-between gap-2 px-4 py-4 text-xs text-ink-soft sm:px-6">
            <span>
              ARINELLI PAY — demo técnica · dados sintéticos · liquidação real via
              webhook + outbox
            </span>
            <span className="bitmap text-step-16">PIX · BOLETO · CARTÃO</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1 tracking-[0.12em] hover:bg-synth hover:text-ink"
    >
      {children}
    </Link>
  );
}
