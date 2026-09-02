import type { Metadata } from "next";
import { ProductsBrowser } from "@/components/products-browser";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { catalogCategories, isLegacyCategorySlug, productFiltersToSearchParams, readProductFilters } from "@/lib/catalog-routing";

export async function generateMetadata({ searchParams }: PageProps<"/products">): Promise<Metadata> {
  const rawParams = await searchParams;
  const categorySlug = typeof rawParams.category === "string" ? rawParams.category : "";
  const category = catalogCategories.find((c) => c.slug === categorySlug);

  if (category) {
    return {
      title: `${category.name} Printing & Rates in Ahmedabad, Gujarat`,
      description: `Commercial ${category.name.toLowerCase()} printing from Mahavir Card in Ahmedabad, Gujarat. Live pricing, custom specifications, and instant CDR upload.`,
      alternates: {
        canonical: `/products?category=${category.slug}`,
      },
    };
  }

  return {
    title: "Commercial Printing Products & Rates | Mahavir Card Ahmedabad",
    description: "Browse all commercial offset printing products from Mahavir Card in Ahmedabad, Gujarat. Visiting cards, brochures, stickers, letterheads, and envelopes.",
    alternates: {
      canonical: "/products",
    },
  };
}

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
