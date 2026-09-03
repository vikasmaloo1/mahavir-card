import type { Metadata } from "next";
import { ProductsBrowser } from "@/components/products-browser";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { Suspense } from "react";
import { getCachedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { catalogCategories, isLegacyCategorySlug, productFiltersToSearchParams, readProductFilters } from "@/lib/catalog-routing";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
  const rawParams = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value)) value.forEach((entry) => params.append(key, entry));
  }
  const session = await getCachedSession();
  const customer = session
    ? (await db.select({ customerType: customers.customerType }).from(customers).where(eq(customers.userId, session.user.id)).limit(1))[0]
    : undefined;
  const isB2B = customer?.customerType === "B2B";
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
      {!initialFilters.category && !initialFilters.search ? (
        <div className="mx-auto max-w-[1440px] px-4 pt-6 lg:px-8">
          <PromotionalBanner placement="CATALOG_TOP" />
        </div>
      ) : null}
      <Suspense fallback={<main className="min-h-screen p-8 text-sm text-[var(--mc-muted)]">Loading products...</main>}>
        <ProductsBrowser key={canonicalParams.toString()} initialFilters={initialFilters} isB2B={isB2B} />
      </Suspense>
      <StorefrontFooter />
    </div>
  );
}
