import { ProductsBrowser } from "@/components/products-browser";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";

export default async function ProductsPage() {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login");
  return (
    <div className="mc-storefront bg-[var(--mc-surface)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />
      <div className="mx-auto max-w-[1440px] px-4 pt-6 lg:px-8">
        <PromotionalBanner placement="CATALOG_TOP" />
      </div>
      <Suspense fallback={<main className="min-h-screen p-8 text-sm text-[var(--mc-muted)]">Loading products...</main>}>
        <ProductsBrowser />
      </Suspense>
      <StorefrontFooter />
    </div>
  );
}
