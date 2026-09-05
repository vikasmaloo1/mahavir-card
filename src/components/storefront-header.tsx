import Image from "next/image";
import Link from "next/link";
import { FileText, ShoppingBag, UserRound } from "lucide-react";
import { eq } from "drizzle-orm";

import { CustomerAccountMenu } from "@/components/customer-account-menu";
import { HeaderSearchBar } from "@/components/header-search-bar";
import { HeaderWalletButton } from "@/components/header-wallet-button";
import { db } from "@/lib/db/server";
import { customers } from "@/lib/db/schema";
import { UPI_VPA } from "@/lib/upi";
import { getCachedSession } from "@/lib/auth/session";

export async function StorefrontHeader() {
  const session = await getCachedSession();
  let availableBalance: string | null = null;

  if (session?.user?.id) {
    try {
      const [customer] = await db
        .select({ availableCredit: customers.availableCredit })
        .from(customers)
        .where(eq(customers.userId, session.user.id))
        .limit(1);
      availableBalance = customer?.availableCredit ?? "0.00";
    } catch {
      availableBalance = "0.00";
    }
  }

  const navigation = session ? [
    ["Home", "/"], ["Order now", "/products"], ["Order status", "/account#orders"],
    ["Wallet / balance", "/account/wallet"], ["Account", "/account"],
  ] : [
    ["Home", "/"], ["Order now", "/products"], ["Request quote", "/quote"],
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--mc-line)] border-t-[3px] border-t-[var(--mc-accent)] bg-[var(--mc-paper)]/95 shadow-[0_8px_28px_rgba(16,33,63,0.05)] backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:py-3.5 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Mahavir Card home">
          <Image src="/api/branding/assets/logo.primary/file" alt="Mahavir Card mark" width={52} height={52} priority unoptimized className="size-12 sm:size-14 rounded-full object-cover shadow-sm ring-2 ring-white" />
          <span>
            <strong className="block text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--mc-ink)] leading-tight">Mahavir Card</strong>
            <span className="hidden text-[13px] sm:text-sm font-semibold text-[var(--mc-accent)] sm:block">Offset printing {"\u00b7"} Business cards {"\u00b7"} Ahmedabad, Gujarat</span>
          </span>
        </Link>

        <HeaderSearchBar className="hidden min-w-0 max-w-xl flex-1 md:block" />

        <div className="flex items-center gap-1.5 text-sm sm:gap-2">
          {session ? (
            <HeaderWalletButton
              initialBalance={availableBalance}
              isLoggedIn={true}
              upiVpa={UPI_VPA}
            />
          ) : null}
          {session ? <CustomerAccountMenu /> : <Link href="/login" aria-label="Login" className="flex items-center gap-1.5 px-2.5 py-2 min-h-[40px] rounded-full text-[var(--mc-muted)] hover:text-[var(--mc-ink)] hover:bg-[var(--mc-surface)]"><UserRound size={17} /> <span className="hidden sm:inline font-semibold">Login</span></Link>}
          <Link href="/cart" className="grid size-10 place-items-center rounded-full border border-[var(--mc-line)] bg-white text-[var(--mc-ink)] hover:border-[var(--mc-accent)] hover:text-[var(--mc-accent)] transition-colors" aria-label="Purchase basket"><ShoppingBag size={17} /></Link>
          <Link href="/quote" aria-label="Quote basket" className="flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-3.5 py-2 min-h-[40px] font-semibold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm"><FileText size={16} /> <span className="hidden sm:inline">Quote basket</span></Link>
        </div>
      </div>

      <HeaderSearchBar compact placeholder="Search products..." className="mx-4 mb-3 md:hidden" />

      <nav className="mx-auto hidden max-w-[1440px] gap-x-6 gap-y-2 overflow-x-auto px-4 pb-3 text-sm font-semibold text-[var(--mc-muted)] md:flex lg:px-8" aria-label={session ? "Customer navigation" : "Product categories"}>{navigation.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap hover:text-[var(--mc-ink)] transition-colors">{label}</Link>)}</nav>

      <nav className="flex gap-4 overflow-x-auto border-t border-[var(--mc-line)] px-4 py-2 text-sm font-semibold text-[var(--mc-muted)] md:hidden scrollbar-none" aria-label={session ? "Mobile customer navigation" : "Mobile product categories"}>{navigation.map(([label, href]) => <Link key={href} href={href} className="shrink-0 py-1.5 px-2 rounded hover:text-[var(--mc-accent)] hover:bg-[var(--mc-surface)] whitespace-nowrap">{label}</Link>)}</nav>
    </header>
  );
}
