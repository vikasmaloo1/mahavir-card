import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock3 } from "lucide-react";

import { CategoryCopy } from "@/components/category-copy";
import { CustomerNotices } from "@/components/customer-notices";
import { ProductImage } from "@/components/product-image";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { categoryCopy } from "@/content/category-copy";
import { getCategoryListing } from "@/lib/category-listing";
import { seoCategoryByPath, seoCategoryPages } from "@/lib/seo-categories";
import { getCachedSession } from "@/lib/auth/session";
import { db } from "@/lib/db/server";
import { customers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SITE = "https://mahavircard.in";

// Only the seven landing pages exist under /<segment>; anything else 404s. Rendered per request
// (the header reads the session cookie) — the HTML is still fully server-rendered for crawlers.
export const dynamicParams = false;
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return seoCategoryPages.map((page) => ({ categoryPage: page.path }));
}

export async function generateMetadata({ params }: { params: Promise<{ categoryPage: string }> }): Promise<Metadata> {
  const { categoryPage } = await params;
  const page = seoCategoryByPath(categoryPage);
  if (!page) return { robots: { index: false, follow: false } };
  const url = `${SITE}/${page.path}`;

  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: `/${page.path}` },
    openGraph: {
      type: "website",
      url,
      title: page.title,
      description: page.description,
      siteName: "Mahavir Card",
      locale: "en_IN",
      images: [{ url: "/images/mahavir-print-assortment.png", width: 1200, height: 630, alt: `${page.name} — Mahavir Card, Ahmedabad` }],
    },
    twitter: { card: "summary_large_image", title: page.title, description: page.description },
  };
}

export default async function CategoryLandingPage({ params }: { params: Promise<{ categoryPage: string }> }) {
  const { categoryPage } = await params;
  const page = seoCategoryByPath(categoryPage);
  if (!page) notFound();

  const session = await getCachedSession();
  const customer = session?.user?.id
    ? (await db.select({ customerType: customers.customerType }).from(customers).where(eq(customers.userId, session.user.id)).limit(1))[0]
    : undefined;
  const isB2B = customer?.customerType === "B2B";
  const isLoggedIn = Boolean(session?.user?.id);
  const customerType = isLoggedIn ? (isB2B ? "B2B" : "B2C") : null;

  const listing = await getCategoryListing(page.category, customerType);
  const items = listing?.items ?? [];
  const url = `${SITE}/${page.path}`;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Products", item: `${SITE}/products` },
      { "@type": "ListItem", position: 3, name: page.name, item: url },
    ],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: page.h1,
    url,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: item.name,
        url: `${SITE}/catalog/${item.slug}`,
        image: `${SITE}${item.imageUrl}`,
        description: item.specification,
        sku: item.slug,
        category: listing?.categoryName ?? page.name,
        brand: { "@type": "Brand", name: "Mahavir Card" },
        ...(isLoggedIn && item.startingPrice
          ? {
              offers: {
                "@type": "Offer",
                url: `${SITE}/catalog/${item.slug}`,
                priceCurrency: "INR",
                price: item.startingPrice.toFixed(2),
                availability: "https://schema.org/InStock",
                seller: { "@type": "Organization", name: "Mahavir Card" },
              },
            }
          : {}),
      },
    })),
  };

  return (
    <div className="mc-storefront bg-[var(--mc-surface)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />

      <main className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8 lg:py-10">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--mc-muted)]">
          <Link href="/" className="hover:text-[var(--mc-accent)]">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-[var(--mc-accent)]">Products</Link>
          <span>/</span>
          <span aria-current="page" className="font-semibold text-[var(--mc-ink)]">{page.name}</span>
        </nav>

        <header className="mt-4 border-b border-[var(--mc-line)] pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mc-accent)]">Mahavir Card · Ahmedabad</p>
          <h1 className="mt-2 max-w-3xl text-3xl font-bold leading-tight text-[var(--mc-ink)] sm:text-[2.35rem]">{page.h1}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--mc-muted)]">{page.description}</p>
          <p className="mt-3 text-sm text-[var(--mc-muted)]">
            {items.length} product{items.length === 1 ? "" : "s"} {!isB2B && isLoggedIn ? "· Prices exclusive of GST " : ""}·{" "}
            <Link href={`/products?category=${page.category}`} className="font-semibold text-[var(--mc-accent)] hover:underline">Filter &amp; order online</Link>
          </p>
        </header>

        {items.length ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label={`${page.name} products`}>
            {items.map((item, index) => (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-[var(--mc-line)] bg-white shadow-sm transition-shadow hover:shadow-md">
                <Link href={`/catalog/${item.slug}`} className="relative block aspect-[1.4] overflow-hidden bg-[var(--mc-accent-soft)]">
                  <ProductImage src={item.imageUrl} alt={item.imageAlt} slug={item.slug} priority={index < 4} />
                </Link>
                <div className="p-4">
                  <h2 className="text-[17px] font-bold leading-snug text-[var(--mc-ink)]">
                    <Link href={`/catalog/${item.slug}`} className="hover:text-[var(--mc-accent)]">{item.name}</Link>
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[var(--mc-muted)]">{item.specification}</p>
                  {isLoggedIn && item.priceLabel !== "Login to view price" ? (
                    <p className="mt-3 text-[15px] font-bold text-[var(--mc-ink)]">{item.priceLabel}</p>
                  ) : (
                    <Link href={`/login?next=${encodeURIComponent(`/${page.path}`)}`} className="mt-3 block text-xs font-bold text-[var(--mc-accent)] hover:underline">
                      Login to view price &rarr;
                    </Link>
                  )}
                  {item.productionTime ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--mc-muted)]"><Clock3 size={13} />{item.productionTime}</p>
                  ) : null}
                  <Link href={`/catalog/${item.slug}`} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)]">
                    Configure &amp; order <ArrowRight size={14} />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-sm text-[var(--mc-muted)]">Products in this range are being updated. <Link href="/contact" className="font-semibold text-[var(--mc-accent)]">Contact us</Link> for a quotation.</p>
        )}

        <CategoryCopy {...(categoryCopy[page.path] ?? {})} />

        <aside className="mt-10 rounded-2xl border border-[var(--mc-line)] bg-white p-5 text-sm leading-6 text-[var(--mc-muted)]">
          <p className="font-bold text-[var(--mc-ink)]">Mahavir Card</p>
          <p>Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad - 380001, Gujarat</p>
          <p>
            <a href="tel:+919426371150" className="hover:text-[var(--mc-accent)]">+91 94263 71150</a> ·{" "}
            <a href="mailto:mahavircard2011@gmail.com" className="hover:text-[var(--mc-accent)]">mahavircard2011@gmail.com</a>
          </p>
          <p className="font-mono text-xs">GSTIN 24AIUPJ2271L1ZV</p>
        </aside>
      </main>
      <StorefrontFooter />
    </div>
  );
}
