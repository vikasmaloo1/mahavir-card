"use client";

import Link from "next/link";
import { ChevronDown, FileText, Package, UserRound, WalletCards } from "lucide-react";

import { LogoutButton } from "@/components/logout-button";

export function CustomerAccountMenu() {
  return <details className="group relative">
    <summary className="flex cursor-pointer list-none items-center gap-2 px-2 py-2 text-[var(--mc-muted)] hover:text-[var(--mc-ink)]">
      <UserRound size={17} /><span className="hidden sm:inline">Account</span><ChevronDown size={14} className="transition group-open:rotate-180" />
    </summary>
    <div className="absolute right-0 top-full z-50 mt-2 w-52 border border-[var(--mc-line)] bg-white p-2 shadow-[0_16px_38px_rgba(16,33,63,0.14)]">
      <MenuLink href="/account" icon={<UserRound size={16} />}>Profile</MenuLink>
      <MenuLink href="/account#orders" icon={<Package size={16} />}>Orders</MenuLink>
      <MenuLink href="/account#quotes" icon={<FileText size={16} />}>Quotes</MenuLink>
      <MenuLink href="/account/wallet" icon={<WalletCards size={16} />}>Wallet / balance</MenuLink>
      <LogoutButton redirectTo="/login" className="mt-1 flex w-full items-center gap-2 border-t border-[var(--mc-line)] px-3 py-2.5 text-left text-sm font-semibold text-[#9b2525] hover:bg-[#fff4f4]" />
    </div>
  </details>;
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return <Link href={href} className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-[var(--mc-muted)] hover:bg-[var(--mc-surface)] hover:text-[var(--mc-ink)]">{icon}{children}</Link>;
}
