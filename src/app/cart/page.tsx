import type { Metadata } from "next";
import Link from "next/link";

import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { PurchaseCart } from "@/components/purchase-cart";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Purchase Basket",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login?next=%2Fcart");
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />
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
        <div className="mt-10">
          <PromotionalBanner placement="CART_CHECKOUT" />
        </div>
      </div>
      <StorefrontFooter />
    </main>
  );
}
