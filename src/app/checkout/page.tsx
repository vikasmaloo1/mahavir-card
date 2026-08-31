import { CheckoutFlow } from "@/components/checkout-flow";
import { StorefrontHeader } from "@/components/storefront-header";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function CheckoutPage() {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login");
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <div className="mx-auto max-w-[1120px] px-4 py-8 lg:px-8 lg:py-12">
        <header className="border-b border-[var(--mc-line)] pb-6">
          <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Secure checkout</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Delivery and payment</h1>
          <p className="mt-2 text-[15px] text-[var(--mc-muted)]">Your total is recalculated securely from the current product rules.</p>
        </header>
        <CheckoutFlow />
      </div>
    </main>
  );
}
