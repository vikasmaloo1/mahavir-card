import { ProductsBrowser } from "@/components/products-browser";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { isLegacyCategorySlug, productFiltersToSearchParams, readProductFilters } from "@/lib/catalog-routing";

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login");
  const rawParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
  }
  const initialFilters = readProductFilters(params);
  const canonicalParams = productFiltersToSearchParams(initialFilters);
  if (isLegacyCategorySlug(params.get("category")) || (params.has("q") && !params.has("search"))) {
    const query = canonicalParams.toString();
    redirect(query ? `/products?${query}` : "/products");
  }
  return (
    <div className="mc-storefront bg-[var(--mc-surface)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />
      <div className="mx-auto max-w-[1440px] px-4 pt-6 lg:px-8">
        <PromotionalBanner placement="CATALOG_TOP" />
      </div>
      <Suspense fallback={<main className="min-h-screen p-8 text-sm text-[var(--mc-muted)]">Loading products...</main>}>
        <ProductsBrowser key={canonicalParams.toString()} initialFilters={initialFilters} />
      </Suspense>
      <StorefrontFooter />
    </div>
  );
}
