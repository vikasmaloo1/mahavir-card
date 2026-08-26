import { ArrowLeft, Clock3, FileUp, ShieldCheck } from "lucide-react";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { ProductConfigurator } from "@/components/product-configurator";
import { ProductImage } from "@/components/product-image";
import { StorefrontHeader } from "@/components/storefront-header";
import { catalogProducts, getCatalogProduct, type CatalogProduct, type ConfigField } from "@/lib/catalog";
import { db } from "@/lib/db/server";
import { categories, products } from "@/lib/db/schema";

export const dynamicParams = true;

const fallbackFields: ConfigField[] = [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "100" }];

async function getDatabaseCatalogProduct(slug: string): Promise<CatalogProduct | null> {
  const [row] = await db.select({ product: products, category: { name: categories.name, slug: categories.slug } }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(eq(products.slug, slug), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
  if (!row) return null;
  const configuration = row.product.configuration as { fields?: unknown };
  const fields = Array.isArray(configuration.fields) ? configuration.fields as ConfigField[] : fallbackFields;
  return { id: row.product.id, category: row.category?.name ?? "Printing", categorySlug: row.category?.slug ?? "printing", name: row.product.name, slug: row.product.slug, shortDescription: row.product.shortDescription ?? "Configure the details for your print job.", description: row.product.description ?? "Choose the options you need and request a quote for the confirmed price.", startingPrice: 0, unit: row.product.referenceQuantity ? `${row.product.referenceQuantity.toLocaleString("en-IN")} units` : "Configured quantity", turnaround: row.product.productionTime ?? "Confirmed after review", color: "blue", tags: [], configuration: fields.length ? fields : fallbackFields, imageUrl: row.product.imageUrl ?? "/images/mahavir-print-assortment.png", orderable: row.product.orderable, quoteable: row.product.quoteable };
}

export function generateStaticParams() {
  return catalogProducts.map((product) => ({ slug: product.slug }));
}

export default async function ProductPage({ params }: PageProps<"/catalog/[slug]">) {
  const { slug } = await params;
  const product = getCatalogProduct(slug) ?? await getDatabaseCatalogProduct(slug);
  if (!product) notFound();

  return <main className="min-h-screen bg-[#f7f9fc] text-[#162237]"><StorefrontHeader />
    <div className="mx-auto max-w-[1440px] px-4 py-6 xl:px-8"><a href="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-[#52647e] hover:text-[#2457b8]"><ArrowLeft size={16} /> All products</a>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,.52fr)_minmax(0,1fr)] xl:items-start"><section><div className="relative aspect-[1.1] overflow-hidden border border-[#d5deeb] bg-[#edf2f8] sm:aspect-[1.25]"><ProductImage src={product.imageUrl} alt={`${product.name} printed sample`} slug={product.slug} priority /><div className="absolute left-4 top-4 bg-white/95 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.13em] text-[#2457b8]">{product.category}</div></div>
        <div className="grid gap-4 border-b border-[#dfe5ef] py-5 sm:grid-cols-3"><div><Clock3 size={18} className="text-[#2457b8]" /><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#607089]">Turnaround</p><p className="mt-1 text-sm font-bold">{product.turnaround}</p></div><div><ShieldCheck size={18} className="text-[#2457b8]" /><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#607089]">Purchase route</p><p className="mt-1 text-sm font-bold">{product.orderable ? "Buy now or request quote" : "Quote confirmed by team"}</p></div><div><FileUp size={18} className="text-[#2457b8]" /><p className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#607089]">Artwork</p><p className="mt-1 text-sm font-bold">CDR only</p></div></div>
        <div className="pt-5"><p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#2457b8]">Product information</p><h1 className="mt-2 text-3xl font-bold">{product.name}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#52647e]">{product.description}</p></div>
      </section><aside className="xl:sticky xl:top-[108px]"><ProductConfigurator product={product} /></aside></div>
    </div>
  </main>;
}
