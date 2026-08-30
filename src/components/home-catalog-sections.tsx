"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileText, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ProductImage } from "@/components/product-image";

type Category = { id?: string; name: string; slug: string; description: string | null; imageUrl?: string | null };
type Product = { id: string; name: string; slug: string; listingSpecification: string | null; imageUrl: string | null; category: { name: string; slug: string } | null; priceLabel: string; priceState: "STARTING" | "CUSTOM_QUOTE" | "CONTACT" | "LOGIN"; taxInclusive: boolean | null; orderable: boolean; quoteable: boolean };

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

  const featured = useMemo(() => {
    const selected: Product[] = [];
    const categoriesSeen = new Set<string>();
    for (const product of products) {
      const categoryKey = product.category?.slug ?? product.category?.name ?? product.id;
      if (categoriesSeen.has(categoryKey)) continue;
      categoriesSeen.add(categoryKey);
      selected.push(product);
      if (selected.length === 6) break;
    }
    return selected;
  }, [products]);

  return <>
    <section className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8 lg:py-16">
      <div className="flex items-end justify-between gap-6"><div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Product families</p><h2 className="mt-2 text-3xl font-bold sm:text-[2rem]">Start with what you need printed.</h2></div><Link href="/products" className="hidden items-center gap-2 text-[15px] font-bold text-[var(--mc-accent)] sm:inline-flex">See all products <ArrowRight size={17} /></Link></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, index) => <Link key={category.slug} href={`/products?category=${category.slug}`} className="group grid min-h-36 grid-cols-[7.25rem_1fr] overflow-hidden rounded-lg border border-[var(--mc-line)] bg-[var(--mc-paper)] shadow-[0_8px_24px_rgba(16,33,63,0.05)] transition hover:border-[var(--mc-accent)] hover:shadow-[0_14px_34px_rgba(40,100,220,0.14)]">
          <div className="relative overflow-hidden bg-[var(--mc-accent-soft)]"><Image src={category.imageUrl || "/images/mahavir-print-assortment.png"} alt="" fill sizes="112px" className="object-cover transition duration-300 group-hover:scale-[1.03]" style={{ objectPosition: category.imageUrl ? "50% 50%" : categoryFocus[category.slug] ?? "50% 55%" }} /></div>
          <div className="flex min-w-0 items-center justify-between gap-3 p-5"><div className="min-w-0"><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">{String(index + 1).padStart(2, "0")}</p><h3 className="mt-1.5 text-lg font-bold text-[var(--mc-ink)]">{category.name}</h3><p className="mt-1.5 line-clamp-2 text-sm leading-5 text-[var(--mc-muted)]">{category.description}</p></div><ArrowRight size={19} className="shrink-0 text-[var(--mc-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--mc-accent)]" /></div>
        </Link>)}
      </div>
      <Link href="/products" className="mt-5 inline-flex items-center gap-2 text-[15px] font-bold text-[var(--mc-accent)] sm:hidden">See all products <ArrowRight size={17} /></Link>
    </section>

    <section className="border-y border-[var(--mc-line)] bg-[#f0f5ff]">
      <div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8 lg:py-16">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Ready-to-order products</p><h2 className="mt-2 text-3xl font-bold sm:text-[2rem]">See the price before you configure.</h2></div><p className="max-w-md text-[15px] leading-6 text-[var(--mc-muted)]">Every starting price comes from the current active catalogue managed by the Mahavir Card team.</p></div>
        {featured.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map((product) => <article key={product.id} className="overflow-hidden rounded-lg border border-[var(--mc-line)] bg-[var(--mc-paper)] shadow-[0_12px_34px_rgba(16,33,63,0.08)] transition hover:-translate-y-0.5 hover:border-[#a9c2ef] hover:shadow-[0_18px_42px_rgba(40,100,220,0.14)]"><Link href={`/catalog/${product.slug}`} className="relative block aspect-[1.72] overflow-hidden bg-white"><ProductImage src={product.imageUrl || "/images/mahavir-print-assortment.png"} alt={`${product.name} print sample`} slug={product.slug} /><span className="absolute left-3 top-3 rounded-full bg-[var(--mc-paper)]/95 px-3 py-1.5 text-xs font-bold uppercase text-[var(--mc-accent)] shadow-sm">{product.category?.name ?? "Print product"}</span></Link><div className="p-5"><h3 className="text-xl font-bold text-[var(--mc-ink)]">{product.name}</h3><p className="mt-2 min-h-10 text-[15px] leading-6 text-[var(--mc-muted)]">{product.listingSpecification || "Production-ready print specification."}</p><div className="mt-5 border-t border-[var(--mc-line)] pt-4"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">{product.priceState === "STARTING" ? "Online price" : "Pricing"}</p><p className="mt-1.5 text-xl font-bold text-[var(--mc-ink)]">{product.priceLabel}</p>{product.taxInclusive ? <p className="mt-1 text-xs font-medium text-[var(--mc-muted)]">GST included</p> : null}</div><div className="mt-5 flex flex-wrap gap-2.5"><Link href={`/catalog/${product.slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white">Configure <ArrowRight size={16} /></Link>{product.orderable ? <Link href={`/catalog/${product.slug}?intent=buy`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-[var(--mc-accent)]"><ShoppingBag size={16} />Buy now</Link> : null}{product.quoteable ? <Link href={`/catalog/${product.slug}?intent=quote`} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-line)] px-4 py-2.5 text-sm font-bold text-[var(--mc-muted)]"><FileText size={16} />Request quote</Link> : null}</div></div></article>)}</div> : <div className="mt-8 rounded-lg border border-[var(--mc-line)] bg-[var(--mc-paper)] p-6 text-[15px] text-[var(--mc-muted)]">Loading current products...</div>}
      </div>
    </section>
  </>;
}
