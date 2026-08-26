"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ProductImage } from "@/components/product-image";

type Category = { id?: string; name: string; slug: string; description: string | null; imageUrl?: string | null };
type Product = { id: string; name: string; slug: string; shortDescription: string | null; imageUrl: string | null; category: { name: string } | null; startingPrice: number | null; referenceQuantity: number | null; orderable: boolean; quoteable: boolean };

const featuredSlugs = ["business-card-nt-single-side", "brochures", "product-labels", "packaging-boxes", "notebooks", "paper-bags"];
const categoryFocus: Record<string, string> = { "business-cards": "53% 76%", printing: "20% 46%", packaging: "69% 31%", "labels-stickers": "91% 58%", stationery: "35% 70%", "branding-signage": "25% 43%", "corporate-gifting": "72% 78%" };

export function HomeCatalogSections({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/categories").then((response) => response.json()),
      fetch("/api/products").then((response) => response.json()),
    ]).then(([categoryPayload, productPayload]) => {
      if (!active) return;
      if (categoryPayload.success) setCategories(categoryPayload.data);
      if (productPayload.success) setProducts(productPayload.data);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const featured = useMemo(() => featuredSlugs.map((slug) => products.find((product) => product.slug === slug)).filter((product): product is Product => Boolean(product)), [products]);

  return <>
    <section className="mx-auto max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14">
      <div className="flex items-end justify-between gap-6"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mc-accent)]">Product families</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Start with what you need printed.</h2></div><Link href="/products" className="hidden items-center gap-2 text-sm font-bold text-[var(--mc-accent)] sm:inline-flex">See all products <ArrowRight size={15} /></Link></div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => <Link key={category.slug} href={`/products?category=${category.slug}`} className="group grid min-h-32 grid-cols-[6.5rem_1fr] overflow-hidden border border-[var(--mc-line)] bg-[var(--mc-paper)] shadow-[0_8px_24px_rgba(16,33,63,0.04)] transition hover:border-[var(--mc-accent)] hover:shadow-[0_12px_30px_rgba(40,100,220,0.12)]">
          <div className="relative overflow-hidden bg-[var(--mc-accent-soft)]"><Image src={category.imageUrl || "/images/mahavir-print-assortment.png"} alt="" fill sizes="112px" className="object-cover transition duration-300 group-hover:scale-[1.03]" style={{ objectPosition: category.imageUrl ? "50% 50%" : categoryFocus[category.slug] ?? "50% 55%" }} /></div>
          <div className="flex min-w-0 items-center justify-between gap-3 p-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mc-accent)]">{String(index + 1).padStart(2, "0")}</p><h3 className="mt-1 font-bold text-[var(--mc-ink)]">{category.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--mc-muted)]">{category.description}</p></div><ArrowRight size={17} className="shrink-0 text-[var(--mc-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--mc-accent)]" /></div>
        </Link>)}
      </div>
    </section>

    <section className="border-y border-[var(--mc-line)] bg-[var(--mc-accent-soft)]">
      <div className="mx-auto max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mc-accent)]">Popular print jobs</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Useful products, ready to configure.</h2></div><p className="max-w-md text-sm leading-6 text-[var(--mc-muted)]">Live prices and order options come from the same catalogue managed by the Mahavir Card team.</p></div>
        {featured.length ? <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{featured.map((product) => <article key={product.id} className="overflow-hidden border border-[var(--mc-line)] bg-[var(--mc-paper)] shadow-[0_10px_30px_rgba(16,33,63,0.06)]"><Link href={`/catalog/${product.slug}`} className="relative block aspect-[1.8] overflow-hidden bg-white"><ProductImage src={product.imageUrl || "/images/mahavir-print-assortment.png"} alt={`${product.name} print sample`} slug={product.slug} /><span className="absolute left-3 top-3 bg-[var(--mc-paper)]/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--mc-accent)]">{product.category?.name ?? "Print product"}</span></Link><div className="p-4"><h3 className="font-bold text-[var(--mc-ink)]">{product.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-[var(--mc-muted)]">{product.shortDescription || "Configure the print specification and quantity."}</p><div className="mt-4 flex items-end justify-between gap-3 border-t border-[var(--mc-line)] pt-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--mc-muted)]">{product.startingPrice === null ? "Pricing" : "Starting price"}</p><p className="mt-1 text-sm font-bold text-[var(--mc-ink)]">{product.startingPrice === null ? "On request" : `Rs ${product.startingPrice.toLocaleString("en-IN")} / ${(product.referenceQuantity ?? 1).toLocaleString("en-IN")}`}</p></div><p className="text-xs text-[var(--mc-muted)]">{product.orderable ? "Buy online" : "Quote"}</p></div><div className="mt-4 flex flex-wrap gap-2"><Link href={`/catalog/${product.slug}`} className="inline-flex items-center gap-1.5 bg-[var(--mc-accent)] px-3 py-2.5 text-xs font-bold text-white">Configure <ArrowRight size={14} /></Link>{product.orderable ? <Link href={`/catalog/${product.slug}?intent=buy`} className="inline-flex items-center gap-1.5 border border-[var(--mc-accent)] px-3 py-2.5 text-xs font-bold text-[var(--mc-accent)]"><ShoppingBag size={14} />Buy now</Link> : null}{product.quoteable ? <Link href={`/catalog/${product.slug}?intent=quote`} className="inline-flex items-center gap-1.5 border border-[var(--mc-line)] px-3 py-2.5 text-xs font-bold text-[var(--mc-muted)]"><FileText size={14} />Quote</Link> : null}</div></div></article>)}</div> : <div className="mt-7 border border-[var(--mc-line)] bg-[var(--mc-paper)] p-6 text-sm text-[var(--mc-muted)]">Loading current products...</div>}
      </div>
    </section>
  </>;
}
