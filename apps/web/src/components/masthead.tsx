"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { BriefcaseBusiness, Building2, FileText, ReceiptText, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

const routes = [
  { href: "/clients", label: "Clientes", icon: UsersRound },
  { href: "/contracts", label: "Contratos", icon: FileText },
  { href: "/invoices", label: "Faturas", icon: ReceiptText },
  { href: "/pessoas/fisicas", label: "Pessoas físicas", short: "PF", icon: BriefcaseBusiness },
  { href: "/pessoas/juridicas", label: "Pessoas jurídicas", short: "PJ", icon: Building2 },
];

function Brand() {
  return (
    <Link href="/invoices" className="group flex items-center gap-3" aria-label="Arinelli Pay — Faturas">
      <span className="grid size-8 place-items-center border border-signal/55 bg-signal/8 text-sm font-semibold text-signal shadow-[inset_0_1px_0_rgb(255_255_255/12%)] transition-colors group-hover:bg-signal group-hover:text-black">A</span>
      <span className="leading-none">
        <span className="block text-sm font-semibold tracking-[0.16em] uppercase">Arinelli</span>
        <span className="mt-1 block text-[9px] tracking-[0.34em] text-read-faint uppercase">Pay Registry</span>
      </span>
    </Link>
  );
}

function NavItems({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return routes.map((route) => {
    const active = pathname.startsWith(route.href);
    const Icon = route.icon;
    return (
      <Link
        key={route.href}
        href={route.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center justify-center transition-colors",
          mobile ? "min-w-0 flex-1 flex-col gap-1 px-1 py-2 text-[9px] tracking-[0.08em] uppercase" : "gap-2 px-3 py-2 text-[11px] font-medium tracking-[0.12em] uppercase",
          active ? "text-signal" : "text-read-soft hover:text-read",
        )}
      >
        {mobile ? <Icon className="size-4" aria-hidden /> : null}
        <span className={mobile ? "max-w-full truncate" : ""}>{mobile ? route.short ?? route.label : route.label}</span>
        {active ? (
          <motion.span
            layoutId={mobile ? "mobile-route" : "desktop-route"}
            className={cn("absolute bg-signal", mobile ? "inset-x-3 top-0 h-px" : "inset-x-3 -bottom-px h-px")}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
          />
        ) : null}
      </Link>
    );
  });
}

export function Masthead() {
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-chassis/78 backdrop-blur-2xl">
        <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav className="hidden items-center md:flex" aria-label="Navegação principal"><NavItems /></nav>
          <div className="hidden items-center gap-2 text-[10px] tracking-[0.14em] text-read-faint uppercase xl:flex">
            <span className="size-1.5 bg-signal shadow-[0_0_8px_rgb(197_164_97/70%)]" /> Operação local
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-3 bottom-3 z-40 flex overflow-hidden border border-white/12 bg-chassis/88 shadow-2xl backdrop-blur-2xl md:hidden" aria-label="Navegação principal">
        <NavItems mobile />
      </nav>
    </>
  );
}
