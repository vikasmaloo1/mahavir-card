import { ArrowLeft, Clock3, FileUp, ShieldCheck } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";

import { ProductConfigurator } from "@/components/product-configurator";
import { ProductImage } from "@/components/product-image";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { type CatalogProduct, type ConfigField } from "@/lib/catalog";
import { db } from "@/lib/db/server";
import { artworkRequirements, categories, pricingRules, products, productVariants } from "@/lib/db/schema";
import { conciseProductSpecification, deriveStartingPrice, type StartingPrice } from "@/lib/product-listing-pricing";
import { auth } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

const fallbackFields: ConfigField[] = [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "100" }];
type PageProduct = CatalogProduct & StartingPrice & { artworkFormatLabel: string };

async function getDatabaseCatalogProduct(slug: string, authenticated: boolean): Promise<PageProduct | null> {
  const [row] = await db.select({ product: products, category: { name: categories.name, slug: categories.slug } }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, slug), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
  if (!row) return null;

  const [rules, requirements] = await Promise.all([
    authenticated ? db.select({ productId: pricingRules.productId, variantId: pricingRules.variantId, variantActive: productVariants.isActive, conditions: pricingRules.conditions, priceFormula: pricingRules.priceFormula, taxInclusive: pricingRules.taxInclusive, isActive: pricingRules.isActive }).from(pricingRules).leftJoin(productVariants, eq(pricingRules.variantId, productVariants.id)).where(and(eq(pricingRules.productId, row.product.id), eq(pricingRules.isActive, true))) : Promise.resolve([]),
    db.select({ acceptedFormats: artworkRequirements.acceptedFormats }).from(artworkRequirements).where(and(eq(artworkRequirements.productId, row.product.id), eq(artworkRequirements.isActive, true))),
  ]);
  const configuration = row.product.configuration as { fields?: unknown };
  const fields = Array.isArray(configuration.fields) ? configuration.fields as ConfigField[] : fallbackFields;

  return {
    id: row.product.id,
    category: row.category?.name ?? "Printing",
    categorySlug: row.category?.slug ?? "printing",
    name: row.product.name,
    slug: row.product.slug,
    shortDescription: row.product.shortDescription ?? "Configure the details for your print job.",
    description: conciseProductSpecification(row.product.name, row.product.description, row.category?.name ?? null),
    unit: row.product.referenceQuantity ? `${row.product.referenceQuantity.toLocaleString("en-IN")} units` : "Configured quantity",
    turnaround: row.product.productionTime ?? "Confirmed after review",
    color: "blue",
    tags: [],
    configuration: fields.length ? fields : fallbackFields,
    imageUrl: row.product.imageUrl ?? "/images/mahavir-print-assortment.png",
    orderable: row.product.orderable,
    quoteable: row.product.quoteable,
    ...(authenticated ? deriveStartingPrice(row.product, rules) : { startingPrice: null, startingQuantity: null, currency: "INR" as const, priceLabel: "Login to view price", priceState: "CONTACT" as const, taxInclusive: null }),
    artworkFormatLabel: row.product.artworkRequired || requirements.length ? "CDR only" : "Optional",
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/catalog/[slug]">) {
  const { slug } = await params;
  const query = await searchParams;
  if (slug === "business-cards") redirect("/products?category=business-cards");
  const session = await auth.api.getSession({ headers: await headers() });
  const product = await getDatabaseCatalogProduct(slug, Boolean(session));
  if (!product) notFound();
  const descriptor = product.categorySlug === "business-cards" ? "Offset printing \u00b7 Business cards" : product.categorySlug === "packaging" ? "Packaging \u00b7 Printed boxes and bags" : product.categorySlug === "labels-stickers" ? "Labels and stickers \u00b7 Product printing" : `${product.category} \u00b7 Commercial printing`;

  return <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]"><StorefrontHeader />
    <div className="mx-auto max-w-[1440px] px-4 py-7 xl:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><a href="/products" className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--mc-muted)] hover:text-[var(--mc-accent)]"><ArrowLeft size={17} /> All products</a><p className="text-sm font-semibold text-[var(--mc-muted)]">{descriptor}</p></div>
      <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,.52fr)_minmax(0,1fr)] xl:items-start"><section><div className="relative aspect-[1.1] overflow-hidden rounded-lg border border-[#d5deeb] bg-[#edf2f8] sm:aspect-[1.25]"><ProductImage src={product.imageUrl} alt={`${product.name} printed sample`} slug={product.slug} priority /><div className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-bold uppercase text-[#2457b8]">{product.category}</div></div>
        <div className="grid gap-5 border-b border-[#dfe5ef] py-6 sm:grid-cols-3"><div><Clock3 size={20} className="text-[#2457b8]" /><p className="mt-2 text-xs font-bold uppercase text-[#607089]">Turnaround</p><p className="mt-1 text-[15px] font-bold">{product.turnaround}</p></div><div><ShieldCheck size={20} className="text-[#2457b8]" /><p className="mt-2 text-xs font-bold uppercase text-[#607089]">Purchase route</p><p className="mt-1 text-[15px] font-bold">{product.orderable ? "Buy now or request quote" : "Quote confirmed by team"}</p></div><div><FileUp size={20} className="text-[#2457b8]" /><p className="mt-2 text-xs font-bold uppercase text-[#607089]">Artwork</p><p className="mt-1 text-[15px] font-bold">{product.artworkFormatLabel}</p></div></div>
        <div className="pt-6"><p className="text-xs font-bold uppercase text-[#2457b8]">Product information</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{product.name}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#52647e]">{product.description}</p><div className="mt-5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-[#c7d7f3] bg-[var(--mc-accent-soft)] px-4 py-2.5"><span className="text-xs font-bold uppercase text-[var(--mc-accent)]">Price</span><strong className="text-base">{product.priceLabel}</strong>{product.taxInclusive ? <span className="text-xs text-[var(--mc-muted)]">GST included</span> : null}</div></div>
      </section><aside className="xl:sticky xl:top-[116px]">{session ? <ProductConfigurator product={product} editItemId={typeof query.editItem === "string" ? query.editItem : undefined} editKind={query.kind === "QUOTE" ? "QUOTE" : "PURCHASE"} /> : <section className="border border-[#cfd8e8] bg-white p-6 shadow-[0_10px_30px_rgba(16,33,63,0.08)]"><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#2457b8]">Customer pricing</p><h2 className="mt-2 text-2xl font-bold">Sign in to configure and view prices.</h2><p className="mt-3 text-[15px] leading-6 text-[#607089]">Prices, delivery charges, credit terms, and location adjustments are available for registered customers.</p><Link href="/login" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#2457b8] px-5 py-3 text-sm font-bold text-white">Customer login</Link></section>}</aside></div>
    </div>
    <StorefrontFooter />
  </main>;
}
