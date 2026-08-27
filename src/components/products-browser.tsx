"use client";

import Link from "next/link";
import { ArrowRight, FileText, FileUp, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ProductImage } from "@/components/product-image";

type Product = { id: string; name: string; slug: string; shortDescription: string | null; imageUrl: string | null; category: { name: string; slug: string } | null; priceLabel: string; priceState: "STARTING" | "CUSTOM_QUOTE" | "CONTACT"; startingQuantity: number | null; taxInclusive: boolean | null; orderable: boolean; quoteable: boolean; hasAddons: boolean; hasArtworkRequirement: boolean };
type Category = { id: string; name: string; slug: string };
type Pagination = { page: number; limit: number; total: number; totalPages: number };

export function ProductsBrowser() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [orderable, setOrderable] = useState(() => searchParams.get("orderable") === "true");
  const [quoteable, setQuoteable] = useState(() => searchParams.get("quoteable") === "true");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/categories").then((response) => response.json()).then((payload) => { if (active && payload.success) setCategories(payload.data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("category", category);
    if (orderable) params.set("orderable", "true");
    if (quoteable) params.set("quoteable", "true");
    params.set("page", String(page));
    params.set("limit", "12");
    fetch(`/api/products?${params}`, { signal: controller.signal }).then((response) => response.json()).then((payload) => {
      if (payload.success) { setItems(payload.data.items); setPagination(payload.data.pagination); setError(""); }
      else setError("Products could not be loaded.");
    }).catch((caught) => { if (caught.name !== "AbortError") setError("Products could not be loaded."); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [category, orderable, page, query, quoteable]);

  const clear = () => { setQuery(""); setCategory(""); setOrderable(false); setQuoteable(false); setPage(1); };

  return <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
    <div className="mx-auto max-w-[1440px] px-4 py-8 lg:px-8 lg:py-12">
      <header className="border-b border-[var(--mc-line)] pb-7">
        <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Product catalogue</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-[2.5rem]">Choose the print job you need.</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[var(--mc-muted)]">Compare current starting prices, artwork requirements and order options in one place.</p></div><p className="text-[15px] font-semibold text-[var(--mc-muted)]">{pagination.total} products</p></div>
      </header>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--mc-line)] bg-[var(--mc-paper)] px-4 shadow-sm"><Search size={18} className="shrink-0 text-[var(--mc-muted)]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search business cards, labels, brochures..." className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] outline-none" />{query ? <button type="button" onClick={() => { setQuery(""); setPage(1); }} className="grid size-9 place-items-center" aria-label="Clear search"><X size={17} /></button> : null}</label>
        <button type="button" onClick={clear} className="border border-[var(--mc-line)] bg-[var(--mc-paper)] px-5 py-3 text-sm font-bold text-[var(--mc-accent)]">Clear filters</button>
      </div>

      <div className="mt-4 border-y border-[var(--mc-line)] py-4">
        <div className="flex flex-wrap items-center gap-2"><span className="mr-2 inline-flex items-center gap-2 text-xs font-bold uppercase text-[var(--mc-muted)]"><SlidersHorizontal size={15} />Categories</span><button type="button" onClick={() => { setCategory(""); setPage(1); }} className={`border-b-2 px-3 py-2.5 text-[15px] font-semibold ${!category ? "border-[var(--mc-accent)] text-[var(--mc-ink)]" : "border-transparent text-[var(--mc-muted)]"}`}>All products</button>{categories.map((item) => <button type="button" key={item.id} onClick={() => { setCategory(item.slug); setPage(1); }} className={`border-b-2 px-3 py-2.5 text-[15px] font-semibold ${category === item.slug ? "border-[var(--mc-accent)] text-[var(--mc-ink)]" : "border-transparent text-[var(--mc-muted)]"}`}>{item.name}</button>)}</div>
        <div className="mt-3 flex flex-wrap gap-5 text-[15px] text-[var(--mc-muted)]"><label className="flex items-center gap-2.5"><input type="checkbox" checked={orderable} onChange={(event) => { setOrderable(event.target.checked); setPage(1); }} className="size-[18px] accent-[var(--mc-accent)]" />Buy online</label><label className="flex items-center gap-2.5"><input type="checkbox" checked={quoteable} onChange={(event) => { setQuoteable(event.target.checked); setPage(1); }} className="size-[18px] accent-[var(--mc-accent)]" />Quote available</label></div>
      </div>

      {error ? <p className="mt-6 border border-[#d9bdb5] bg-[var(--mc-paper)] p-4 text-sm font-semibold text-[#873f32]">{error}</p> : null}
      {loading ? <p className="mt-6 border border-[var(--mc-line)] bg-[var(--mc-paper)] p-5 text-sm text-[var(--mc-muted)]">Loading products...</p> : null}

      {!loading && !error ? <section className="mt-6 space-y-3">
        <div className="hidden grid-cols-[minmax(16rem,1.25fr)_minmax(13rem,1.05fr)_10rem_9rem_minmax(17rem,1fr)] gap-5 px-5 py-2 text-xs font-bold uppercase text-[var(--mc-muted)] xl:grid"><span>Product</span><span>Specification</span><span>Price</span><span>Production</span><span>Actions</span></div>
        {items.map((item) => <article key={item.id} className="grid gap-5 rounded-lg border border-[var(--mc-line)] bg-[var(--mc-paper)] px-4 py-5 shadow-[0_6px_20px_rgba(16,33,63,0.04)] sm:grid-cols-2 sm:px-5 xl:grid-cols-[minmax(16rem,1.25fr)_minmax(13rem,1.05fr)_10rem_9rem_minmax(17rem,1fr)] xl:items-center">
          <div className="flex items-center gap-4"><Link href={`/catalog/${item.slug}`} className="relative h-20 w-24 shrink-0 overflow-hidden rounded-md bg-[var(--mc-accent-soft)]"><ProductImage src={item.imageUrl || "/images/mahavir-print-assortment.png"} alt={`${item.name} print sample`} slug={item.slug} /></Link><div className="min-w-0"><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">{item.category?.name ?? "Print product"}</p><p className="mt-1.5 text-lg font-bold leading-6 text-[var(--mc-ink)]">{item.name}</p></div></div>
          <div><p className="text-[15px] leading-6 text-[var(--mc-muted)]">{item.shortDescription || "Configure print, quantity, and delivery."}</p>{item.startingQuantity ? <p className="mt-1 text-sm text-[var(--mc-muted)]">Reference quantity: {item.startingQuantity.toLocaleString("en-IN")}</p> : null}</div>
          <div><p className="text-xs font-bold uppercase text-[var(--mc-muted)] xl:hidden">Price</p><p className="mt-1 text-lg font-bold leading-6 text-[var(--mc-ink)] xl:mt-0">{item.priceLabel}</p>{item.taxInclusive ? <p className="mt-1 text-xs text-[var(--mc-muted)]">GST included</p> : null}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-[var(--mc-muted)] xl:block xl:space-y-1.5"><p>{item.hasAddons ? "Add-ons available" : "No add-ons"}</p>{item.hasArtworkRequirement ? <p className="inline-flex items-center gap-1.5"><FileUp size={15} />Artwork required</p> : null}</div>
          <div className="flex flex-wrap gap-2.5"><Link href={`/catalog/${item.slug}`} className="inline-flex items-center gap-1.5 bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)]">Configure <ArrowRight size={16} /></Link>{item.orderable ? <Link href={`/catalog/${item.slug}?intent=buy`} className="border border-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-[var(--mc-accent)]">Buy now</Link> : null}{item.quoteable ? <Link href={`/catalog/${item.slug}?intent=quote`} className="inline-flex items-center gap-1.5 border border-[var(--mc-line)] px-4 py-2.5 text-sm font-bold text-[var(--mc-muted)]"><FileText size={16} />Quote</Link> : null}</div>
        </article>)}
        {!items.length ? <div className="rounded-lg border border-[var(--mc-line)] bg-[var(--mc-paper)] px-5 py-12 text-center text-[15px] text-[var(--mc-muted)]">No products match these filters.</div> : null}
        {pagination.totalPages > 1 ? <nav aria-label="Product pages" className="flex items-center justify-between border-t border-[var(--mc-line)] pt-5"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[var(--mc-line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--mc-accent)] disabled:cursor-not-allowed disabled:opacity-40">Previous</button><p className="text-sm font-semibold text-[var(--mc-muted)]">Page {pagination.page} of {pagination.totalPages}</p><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} className="rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Next</button></nav> : null}
      </section> : null}
    </div>
  </main>;
}
