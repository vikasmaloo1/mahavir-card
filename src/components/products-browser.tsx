"use client";

import Link from "next/link";
import { ArrowRight, FileText, FileUp, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Product = { id: string; name: string; slug: string; shortDescription: string | null; category: { name: string; slug: string } | null; startingPrice: number | null; referenceQuantity: number | null; orderable: boolean; quoteable: boolean; hasAddons: boolean; hasArtworkRequirement: boolean };
type Category = { id: string; name: string; slug: string };

export function ProductsBrowser() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [category, setCategory] = useState(() => searchParams.get("category") ?? "");
  const [orderable, setOrderable] = useState(() => searchParams.get("orderable") === "true");
  const [quoteable, setQuoteable] = useState(() => searchParams.get("quoteable") === "true");
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
    fetch(`/api/products?${params}`, { signal: controller.signal }).then((response) => response.json()).then((payload) => {
      if (payload.success) { setItems(payload.data); setError(""); }
      else setError("Products could not be loaded.");
    }).catch((caught) => { if (caught.name !== "AbortError") setError("Products could not be loaded."); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [category, orderable, query, quoteable]);

  const clear = () => { setQuery(""); setCategory(""); setOrderable(false); setQuoteable(false); };

  return <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
    <div className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8 lg:py-10">
      <header className="border-b border-[var(--mc-line)] pb-6">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--mc-accent)]">Product catalogue</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">Choose the print job you need.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--mc-muted)]">See real prices, artwork requirements and order options before opening a product.</p></div><p className="text-sm font-semibold text-[var(--mc-muted)]">{items.length} products</p></div>
      </header>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-w-0 items-center gap-3 border border-[var(--mc-line)] bg-[var(--mc-paper)] px-3"><Search size={17} className="shrink-0 text-[var(--mc-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search business cards, labels, brochures..." className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />{query ? <button type="button" onClick={() => setQuery("")} className="grid size-8 place-items-center" aria-label="Clear search"><X size={16} /></button> : null}</label>
        <button type="button" onClick={clear} className="border border-[var(--mc-line)] bg-[var(--mc-paper)] px-4 py-3 text-sm font-bold text-[var(--mc-accent)]">Clear filters</button>
      </div>

      <div className="mt-4 border-y border-[var(--mc-line)] py-4">
        <div className="flex flex-wrap items-center gap-2"><span className="mr-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.11em] text-[var(--mc-muted)]"><SlidersHorizontal size={14} />Categories</span><button type="button" onClick={() => setCategory("")} className={`border-b-2 px-2 py-2 text-sm font-semibold ${!category ? "border-[var(--mc-accent)] text-[var(--mc-ink)]" : "border-transparent text-[var(--mc-muted)]"}`}>All products</button>{categories.map((item) => <button type="button" key={item.id} onClick={() => setCategory(item.slug)} className={`border-b-2 px-2 py-2 text-sm font-semibold ${category === item.slug ? "border-[var(--mc-accent)] text-[var(--mc-ink)]" : "border-transparent text-[var(--mc-muted)]"}`}>{item.name}</button>)}</div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--mc-muted)]"><label className="flex items-center gap-2"><input type="checkbox" checked={orderable} onChange={(event) => setOrderable(event.target.checked)} className="size-4 accent-[var(--mc-accent)]" />Buy online</label><label className="flex items-center gap-2"><input type="checkbox" checked={quoteable} onChange={(event) => setQuoteable(event.target.checked)} className="size-4 accent-[var(--mc-accent)]" />Quote available</label></div>
      </div>

      {error ? <p className="mt-6 border border-[#d9bdb5] bg-[var(--mc-paper)] p-4 text-sm font-semibold text-[#873f32]">{error}</p> : null}
      {loading ? <p className="mt-6 border border-[var(--mc-line)] bg-[var(--mc-paper)] p-5 text-sm text-[var(--mc-muted)]">Loading products...</p> : null}

      {!loading && !error ? <section className="mt-6 overflow-hidden border border-[var(--mc-line)] bg-[var(--mc-paper)]">
        <div className="hidden grid-cols-[minmax(10rem,1.15fr)_minmax(12rem,1.25fr)_7.5rem_8rem_minmax(14rem,1fr)] gap-4 border-b border-[var(--mc-line)] bg-[var(--mc-accent-soft)] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mc-muted)] xl:grid"><span>Product</span><span>Specification</span><span>Price</span><span>Production</span><span>Actions</span></div>
        {items.map((item) => <article key={item.id} className="grid gap-4 border-b border-[var(--mc-line)] px-4 py-5 last:border-0 sm:grid-cols-2 sm:px-5 xl:grid-cols-[minmax(10rem,1.15fr)_minmax(12rem,1.25fr)_7.5rem_8rem_minmax(14rem,1fr)] xl:items-center">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--mc-accent)] xl:hidden">{item.category?.name ?? "Print product"}</p><p className="mt-1 font-bold text-[var(--mc-ink)] xl:mt-0">{item.name}</p><p className="mt-1 hidden text-xs text-[var(--mc-muted)] xl:block">{item.category?.name ?? "Print product"}</p></div>
          <div><p className="text-sm leading-5 text-[var(--mc-muted)]">{item.shortDescription || "Configure print, quantity, and delivery."}</p><p className="mt-1 text-xs text-[var(--mc-muted)]">Reference quantity: {item.referenceQuantity?.toLocaleString("en-IN") ?? "on configuration"}</p></div>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--mc-muted)] xl:hidden">Price</p><p className="mt-1 font-bold text-[var(--mc-ink)] xl:mt-0">{item.startingPrice === null ? "On request" : `From Rs ${item.startingPrice.toLocaleString("en-IN")}`}</p></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--mc-muted)] xl:block xl:space-y-1"><p>{item.hasAddons ? "Add-ons available" : "No add-ons"}</p>{item.hasArtworkRequirement ? <p className="inline-flex items-center gap-1"><FileUp size={13} />CDR required</p> : null}</div>
          <div className="flex flex-wrap gap-2"><Link href={`/catalog/${item.slug}`} className="inline-flex items-center gap-1.5 bg-[var(--mc-accent)] px-3 py-2.5 text-xs font-bold text-white hover:bg-[var(--mc-accent-dark)]">Configure <ArrowRight size={14} /></Link>{item.orderable ? <Link href={`/catalog/${item.slug}?intent=buy`} className="border border-[var(--mc-accent)] px-3 py-2.5 text-xs font-bold text-[var(--mc-accent)]">Buy now</Link> : null}{item.quoteable ? <Link href={`/catalog/${item.slug}?intent=quote`} className="inline-flex items-center gap-1.5 border border-[var(--mc-line)] px-3 py-2.5 text-xs font-bold text-[var(--mc-muted)]"><FileText size={14} />Quote</Link> : null}</div>
        </article>)}
        {!items.length ? <div className="px-5 py-12 text-center text-sm text-[var(--mc-muted)]">No products match these filters.</div> : null}
      </section> : null}
    </div>
  </main>;
}
