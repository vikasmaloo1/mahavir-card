import Image from "next/image";
import Link from "next/link";
import { FileText, Search, ShoppingBag, UserRound } from "lucide-react";
import { headers } from "next/headers";

import { CustomerAccountMenu } from "@/components/customer-account-menu";
import { auth } from "@/lib/auth/server";

export async function StorefrontHeader() {
  const session = await auth.api.getSession({ headers: await headers() });
  const navigation = session ? [
    ["Home", "/"], ["Order now", "/products"], ["Order status", "/account#orders"],
    ["Wallet / balance", "/account/wallet"], ["Account", "/account"],
  ] : [
    ["Home", "/"], ["Order now", "/products"], ["Request quote", "/quote"],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--mc-line)] border-t-[3px] border-t-[var(--mc-accent)] bg-[var(--mc-paper)]/95 shadow-[0_8px_28px_rgba(16,33,63,0.05)] backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3.5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Mahavir Card home">
          <Image src="/api/branding/assets/logo.primary/file" alt="Mahavir Card mark" width={44} height={44} priority unoptimized className="size-11 rounded-full object-cover" />
          <span>
            <strong className="block text-[17px] text-[var(--mc-ink)]">Mahavir Card</strong>
            <span className="hidden text-xs font-medium text-[var(--mc-muted)] sm:block">Offset printing {"\u00b7"} Business cards {"\u00b7"} Ahmedabad</span>
          </span>
        </Link>

        <form action="/products" className="hidden min-w-0 max-w-xl flex-1 items-center border border-[var(--mc-line)] bg-white px-3 md:flex">
          <Search size={17} className="text-[var(--mc-muted)]" />
          <input name="q" placeholder="Search business cards, boxes, labels..." className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-[#8b9bb5]" />
          <span className="border-l border-[var(--mc-line)] pl-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--mc-muted)]">Find</span>
        </form>

        <div className="flex items-center gap-1.5 text-sm sm:gap-2">
          {session ? <CustomerAccountMenu /> : <Link href="/login" className="flex items-center gap-2 px-2 py-2 text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"><UserRound size={17} /> <span className="hidden sm:inline">Login</span></Link>}
          <Link href="/cart" className="grid size-9 place-items-center border border-[var(--mc-line)] bg-white text-[var(--mc-ink)] hover:border-[var(--mc-accent)]" aria-label="Purchase basket"><ShoppingBag size={17} /></Link>
          <Link href="/quote" className="flex items-center gap-2 bg-[var(--mc-accent)] px-3 py-2.5 font-semibold text-white hover:bg-[var(--mc-accent-dark)]"><FileText size={16} /> <span className="hidden sm:inline">Quote basket</span></Link>
        </div>
      </div>

      <form action="/products" className="mx-4 mb-3 flex items-center border border-[var(--mc-line)] bg-white px-3 md:hidden">
        <Search size={16} className="text-[var(--mc-muted)]" />
        <input name="q" placeholder="Search products..." className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none" />
      </form>

      <nav className="mx-auto hidden max-w-[1440px] gap-x-6 gap-y-2 overflow-x-auto px-4 pb-3 text-sm font-semibold text-[var(--mc-muted)] md:flex lg:px-8" aria-label={session ? "Customer navigation" : "Product categories"}>{navigation.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap hover:text-[var(--mc-ink)]">{label}</Link>)}</nav>

      <nav className="flex gap-5 overflow-x-auto border-t border-[var(--mc-line)] px-4 py-2.5 text-sm font-semibold text-[var(--mc-muted)] md:hidden" aria-label={session ? "Mobile customer navigation" : "Mobile product categories"}>{navigation.map(([label, href]) => <Link key={href} href={href} className="shrink-0 py-1 hover:text-[var(--mc-accent)]">{label}</Link>)}</nav>
    </header>
  );
}
