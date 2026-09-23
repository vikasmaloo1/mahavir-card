import type { Metadata } from "next";
import Link from "next/link";
import { ProductsBrowser } from "@/components/products-browser";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { Suspense } from "react";
import { getCachedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { catalogCategories, isLegacyCategorySlug, productFiltersToSearchParams, readProductFilters } from "@/lib/catalog-routing";
import { categoryHref } from "@/lib/seo-categories";
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
        canonical: categoryHref(category.slug),
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
    ? (await db.select({ customerType: customers.customerType, availableCredit: customers.availableCredit }).from(customers).where(eq(customers.userId, session.user.id)).limit(1))[0]
    : undefined;
  const isB2B = customer?.customerType === "B2B";
  const isLoggedIn = Boolean(session?.user?.id);
  const initialFilters = readProductFilters(params);
  const canonicalParams = productFiltersToSearchParams(initialFilters);
  if (isLegacyCategorySlug(params.get("category")) || (params.has("q") && !params.has("search"))) {
    const query = canonicalParams.toString();
    redirect(query ? `/products?${query}` : "/products");
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://mahavircard.in",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Products",
        item: "https://mahavircard.in/products",
      },
      ...(initialFilters.category
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: catalogCategories.find((c) => c.slug === initialFilters.category)?.name ?? initialFilters.category,
              item: `https://mahavircard.in${categoryHref(initialFilters.category)}`,
            },
          ]
        : []),
    ],
  };

  return (
    <div className="mc-storefront bg-[var(--mc-surface)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />
      {!initialFilters.category && !initialFilters.search ? (
        <div className="mx-auto max-w-[1440px] px-4 pt-6 lg:px-8">
          <PromotionalBanner placement="CATALOG_TOP" />
        </div>
      ) : null}
      <div className="mx-auto max-w-[1440px] px-4 pt-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cbd5e1] bg-gradient-to-r from-[#09192e] to-[#132c50] p-4 text-white shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-[#c59b27] text-[#09192e] font-black text-lg shrink-0">
              📖
            </span>
            <div>
              <p className="text-sm font-extrabold text-white">Looking for the complete rate list &amp; product photos?</p>
              <p className="text-xs text-slate-300">Browse live price ranges, authentic finishes &amp; download PDF catalogue · Helpline: +91 79847 52154</p>
            </div>
          </div>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-xl bg-[#c59b27] px-4 py-2 text-xs font-black text-[#09192e] hover:bg-[#b0871e] transition-all shadow-xs shrink-0"
          >
            View &amp; Download Catalogue &rarr;
          </Link>
        </div>
      </div>
      <Suspense fallback={<main className="min-h-screen p-8 text-sm text-[var(--mc-muted)]">Loading products...</main>}>
        <ProductsBrowser key={canonicalParams.toString()} initialFilters={initialFilters} isB2B={isB2B} walletBalance={isB2B ? customer?.availableCredit ?? null : null} isLoggedIn={isLoggedIn} />
      </Suspense>
      <StorefrontFooter />
    </div>
  );
}
