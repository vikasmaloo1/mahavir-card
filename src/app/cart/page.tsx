import Link from "next/link";

import { PurchaseCart } from "@/components/purchase-cart";
import { StorefrontHeader } from "@/components/storefront-header";

export default function CartPage() {
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <div className="mx-auto max-w-[1120px] px-4 py-8 lg:px-8 lg:py-12">
        <header className="flex flex-col justify-between gap-4 border-b border-[var(--mc-line)] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Purchase basket</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Ready-to-print orders</h1>
            <p className="mt-2 text-[15px] text-[var(--mc-muted)]">Review quantities and configurations before checkout.</p>
          </div>
          <Link href="/quote" className="text-sm font-bold text-[var(--mc-accent)]">Open quote basket</Link>
        </header>
        <PurchaseCart />
      </div>
    </main>
  );
}
