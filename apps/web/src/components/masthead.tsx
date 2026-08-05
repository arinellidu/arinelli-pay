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
      <span className="grid size-8 place-items-center border border-signal-bright/55 bg-gradient-to-br from-signal-bright/25 via-signal/18 to-signal-deep/30 text-sm font-semibold text-signal-bright shadow-[0_0_22px_rgb(229_184_46/38%),inset_0_1px_0_rgb(255_255_255/22%)] transition-all group-hover:border-signal-bright group-hover:bg-gradient-to-br group-hover:from-signal-bright group-hover:via-signal group-hover:to-signal-deep group-hover:text-primary-foreground group-hover:shadow-[0_0_28px_rgb(255_217_102/50%),inset_0_1px_0_rgb(255_255_255/35%)]">A</span>
      <span className="leading-none">
        <span className="block text-sm font-semibold tracking-[0.16em] text-read uppercase">Arinelli</span>
        <span className="mt-1 block text-[9px] tracking-[0.34em] text-signal/70 uppercase">Pay Registry</span>
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
          active ? "text-signal-bright" : "text-read-soft hover:text-read",
        )}
      >
        {mobile ? <Icon className="size-4" aria-hidden /> : null}
        <span className={mobile ? "max-w-full truncate" : ""}>{mobile ? route.short ?? route.label : route.label}</span>
        {active ? (
          <motion.span
            layoutId={mobile ? "mobile-route" : "desktop-route"}
            className={cn("absolute bg-gradient-to-r from-signal-deep via-signal-bright to-signal shadow-[0_0_12px_rgb(229_184_46/55%)]", mobile ? "inset-x-3 top-0 h-px" : "inset-x-3 -bottom-px h-px")}
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
      <header className="surface-chrome surface-frame surface-scan sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav className="hidden items-center md:flex" aria-label="Navegação principal"><NavItems /></nav>
          <div className="hidden items-center gap-2 text-[10px] tracking-[0.14em] text-read-faint uppercase xl:flex">
            <span className="size-1.5 bg-signal-bright shadow-[0_0_10px_rgb(255_217_102/80%),0_0_20px_rgb(229_184_46/50%)]" /> Operação local
          </div>
        </div>
      </header>
      <nav className="surface-chrome surface-frame surface-scan fixed inset-x-3 bottom-3 z-40 flex overflow-hidden rounded-xl border md:hidden" aria-label="Navegação principal">
        <NavItems mobile />
      </nav>
    </>
  );
}
