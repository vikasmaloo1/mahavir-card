import type { Metadata } from "next";
import { CheckoutFlow } from "@/components/checkout-flow";
import { CustomerNotices } from "@/components/customer-notices";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { getCachedSession } from "@/lib/auth/session";
import { UPI_VPA } from "@/lib/upi";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Secure Checkout",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  if (!await getCachedSession()) redirect("/login?next=%2Fcheckout");
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />
      <div className="mx-auto max-w-[1120px] px-4 py-8 lg:px-8 lg:py-12">
        <header className="border-b border-[var(--mc-line)] pb-6">
          <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Secure checkout</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Delivery and payment</h1>
          <p className="mt-2 text-[15px] text-[var(--mc-muted)]">Your total is recalculated securely from the current product rules.</p>
        </header>
        <CheckoutFlow upiVpa={UPI_VPA} />
      </div>
      <StorefrontFooter />
    </main>
  );
}
