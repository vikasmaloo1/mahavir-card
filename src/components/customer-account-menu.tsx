"use client";

import Link from "next/link";
import { Building2, ChevronDown, FileText, Package, UserRound, WalletCards } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";

export function CustomerAccountMenu({
  customerName = "Account",
  companyName = null,
  customerType = null,
}: {
  customerName?: string;
  companyName?: string | null;
  customerType?: string | null;
}) {
  const initials = customerName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("") || "A";

  const firstName = customerName.split(" ")[0] || customerName;

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--mc-line)] bg-white py-1.5 pl-2 pr-2.5 sm:pr-3 min-h-[40px] hover:border-[var(--mc-accent)] hover:bg-[var(--mc-surface)] select-none transition-all shadow-2xs">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--mc-accent-soft)] text-xs font-bold text-[var(--mc-accent)] border border-[var(--mc-accent)]/20">
          {initials}
        </div>
        <div className="hidden text-left sm:block max-w-[130px] md:max-w-[170px] lg:max-w-[220px]">
          <p className="truncate text-xs font-bold leading-tight text-[var(--mc-ink)]" title={customerName}>
            {customerName}
          </p>
          {companyName ? (
            <p className="truncate text-[10px] font-medium text-[var(--mc-muted)] leading-tight mt-0.5" title={companyName}>
              {companyName}
            </p>
          ) : (
            <p className="text-[10px] font-semibold text-[var(--mc-muted)] leading-tight mt-0.5">
              {customerType === "B2B" ? "B2B Account" : "Account"}
            </p>
          )}
        </div>
        <span className="text-xs font-bold text-[var(--mc-ink)] truncate max-w-[80px] sm:hidden">
          {firstName}
        </span>
        <ChevronDown size={14} className="text-[var(--mc-muted)] transition-transform duration-200 group-open:rotate-180 shrink-0" />
      </summary>

      <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--mc-line)] bg-white p-2 shadow-[0_16px_38px_rgba(16,33,63,0.14)]">
        <div className="border-b border-[var(--mc-line)] px-3 py-2.5 mb-1 bg-slate-50/80 rounded-lg">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--mc-muted)]">Signed in</span>
            {customerType ? (
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-[#1e3a5f]">
                {customerType}
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-bold text-sm text-[var(--mc-ink)] truncate" title={customerName}>
            {customerName}
          </p>
          {companyName ? (
            <p className="mt-0.5 text-xs text-[var(--mc-accent)] font-medium truncate flex items-center gap-1.5" title={companyName}>
              <Building2 size={13} className="shrink-0 text-[var(--mc-accent)]" />
              <span className="truncate">{companyName}</span>
            </p>
          ) : null}
        </div>
        <MenuLink href="/account/profile" icon={<UserRound size={16} />}>Profile</MenuLink>
        <MenuLink href="/account#orders" icon={<Package size={16} />}>Orders</MenuLink>
        <MenuLink href="/account#quotes" icon={<FileText size={16} />}>Quotes</MenuLink>
        <MenuLink href="/account/wallet" icon={<WalletCards size={16} />}>Wallet / balance</MenuLink>
        <LogoutButton redirectTo="/login" className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-[var(--mc-line)] px-3 py-2.5 text-left text-sm font-semibold text-[#9b2525] hover:bg-[#fff4f4]" />
      </div>
    </details>
  );
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Link href={href} className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--mc-muted)] hover:bg-[var(--mc-surface)] hover:text-[var(--mc-ink)]">{icon}{children}</Link>;
}
