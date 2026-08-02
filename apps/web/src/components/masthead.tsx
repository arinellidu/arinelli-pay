"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Marca desenhada: a onda que o aparelho lê, dentro do seu próprio aro. */
function Mark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-6 shrink-0"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" className="opacity-35" />
      <path d="M6 13.4c1.6 0 1.9-4.2 3.4-4.2 1.6 0 1.6 6.6 3.2 6.6 1.5 0 1.9-4.6 3.3-4.6.9 0 1.3 1.6 2.1 1.6" />
    </svg>
  );
}

const routes = [
  { href: "/clients", label: "Clientes" },
  { href: "/invoices", label: "Faturas" },
];

export function Masthead() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40">
      {/* mesma receita do vidro dos painéis, mas rente ao topo: sem aro, só a
          aresta de luz e a borda inferior */}
      <div className="border-b border-white/10 bg-white/6 shadow-[inset_0_1px_0_0_rgb(255_255_255/12%),0_10px_30px_-24px_rgb(0_0_0/90%)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:gap-6 sm:px-6">
          <Link
            href="/invoices"
            className="flex min-w-0 items-center gap-2 text-read hover:text-signal sm:gap-2.5"
          >
            <span className="text-signal">
              <Mark />
            </span>
            <span className="truncate text-[13px] font-semibold tracking-[0.12em] uppercase sm:text-[15px] sm:tracking-[0.14em]">
              Arinelli&nbsp;Pay
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {routes.map((route) => {
              const active = pathname.startsWith(route.href);
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative rounded-md px-2 py-1.5 text-xs font-medium tracking-[0.08em] uppercase transition-colors sm:px-3 sm:text-[13px] sm:tracking-[0.1em]",
                    active
                      ? "text-signal"
                      : "text-read-soft hover:bg-white/6 hover:text-read",
                  )}
                >
                  {route.label}
                  {active ? (
                    <span
                      className="absolute inset-x-2 -bottom-px h-px bg-signal sm:inset-x-3"
                      aria-hidden
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
