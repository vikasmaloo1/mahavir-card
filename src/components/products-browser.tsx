"use client";

import Link from "next/link";
import { ArrowRight, Clock3, FileUp, RefreshCw, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductImage } from "@/components/product-image";
import { productFiltersToSearchParams, productListingHref, readProductFilters, type ProductFilters } from "@/lib/catalog-routing";

type ArtworkSummary = { formatLabel: string; fullDesign: string | null; safeArea: string | null; finalSize: string | null; requiredFiles: string[] };
type Product = { id: string; name: string; slug: string; imageUrl: string | null; category: { name: string; slug: string } | null; listingSpecification: string | null; productSize: string | null; productionTime: string | null; priceLabel: string; priceState: "STARTING" | "CUSTOM_QUOTE" | "CONTACT" | "LOGIN"; taxInclusive: boolean | null; orderable: boolean; quoteable: boolean; hasAddons: boolean; hasArtworkRequirement: boolean; artworkSummary: ArtworkSummary | null };
type Category = { id: string; name: string; slug: string };
type Pagination = { page: number; limit: number; total: number; totalPages: number };

export function ProductsBrowser({ initialFilters }: { initialFilters: ProductFilters }) {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState(initialFilters.search);
  const [category, setCategory] = useState(initialFilters.category);
  const [orderable, setOrderable] = useState(initialFilters.orderable);
  const [page, setPage] = useState(initialFilters.page);
  const [requestVersion, setRequestVersion] = useState(0);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState(initialFilters.search);

  useEffect(() => {
    const syncFromHistory = () => {
      const next = readProductFilters(new URLSearchParams(window.location.search));
      setQuery(next.search);
      setDebouncedQuery(next.search);
      setCategory(next.category);
      setOrderable(next.orderable);
      setPage(next.page);
    };
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const next = productFiltersToSearchParams({ category, search: debouncedQuery, orderable, page });
    const nextQuery = next.toString();
    const currentQuery = window.location.search.replace(/^\?/, "");
    if (nextQuery === currentQuery) return;
    window.history.replaceState(null, "", nextQuery ? `/products?${nextQuery}` : "/products");
  }, [category, debouncedQuery, orderable, page]);

  useEffect(() => {
    let active = true;
    fetch("/api/categories").then((response) => response.json()).then((payload) => { if (active && payload.success) setCategories(payload.data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
    if (category) params.set("category", category);
    if (orderable) params.set("orderable", "true");
    params.set("page", String(page));
    params.set("limit", "12");

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      fetch(`/api/products?${params}`, { signal: controller.signal })
        .then(async (response) => ({ response, payload: await response.json().catch(() => null) }))
        .then(({ response, payload }) => {
          if (!response.ok || !payload?.success) throw new Error("request_failed");
          setItems(payload.data.items);
          setPagination(payload.data.pagination);
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setError(caught instanceof TypeError ? "Connection interrupted. Check your connection and retry." : "We couldn't load the product catalogue. Please retry.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [category, debouncedQuery, orderable, page, requestVersion]);

  const hasFilters = Boolean(query || category || orderable);
  const clear = () => { setQuery(""); setDebouncedQuery(""); setCategory(""); setOrderable(false); setPage(1); };
  const listingHref = productListingHref({ category, search: debouncedQuery, orderable, page });
  const productHref = (item: Product) => {
    const params = new URLSearchParams();
    params.set("returnTo", listingHref);
    return `/catalog/${item.slug}?${params}`;
  };

  return <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
    <div className="mx-auto max-w-[1440px] px-4 py-7 lg:px-8 lg:py-10">
      <header className="border-b border-[var(--mc-line)] pb-6">
        <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Product catalogue</p>
        <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-[2.35rem]">Choose a print job.</h1><p className="mt-2 max-w-2xl text-[15px] leading-6 text-[var(--mc-muted)]">Compare specifications, artwork and ordering options in one place.</p></div><p className="text-[15px] font-semibold text-[var(--mc-muted)]">{pagination.total} products</p></div>
      </header>

      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-w-0 items-center gap-3 rounded-xl border border-[var(--mc-line)] bg-[var(--mc-paper)] px-4 shadow-sm"><Search size={18} className="shrink-0 text-[var(--mc-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search visiting cards, brochures, stickers..." className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] outline-none" />{query ? <button type="button" onClick={() => { setQuery(""); setPage(1); }} className="grid size-9 place-items-center rounded-full hover:bg-[var(--mc-surface)]" aria-label="Clear search"><X size={17} /></button> : null}</label>
        {hasFilters ? <button type="button" onClick={clear} className="rounded-full border border-[var(--mc-line)] bg-[var(--mc-paper)] px-5 py-3 text-sm font-bold text-[var(--mc-accent)] hover:bg-[var(--mc-surface)] transition-colors">Clear filters</button> : null}
      </div>

      <div className="mt-4 border-y border-[var(--mc-line)] py-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1"><span className="mr-2 inline-flex shrink-0 items-center gap-2 text-xs font-bold uppercase text-[var(--mc-muted)]"><SlidersHorizontal size={15} />Categories</span><button type="button" onClick={() => { setCategory(""); setPage(1); }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${!category ? "bg-[var(--mc-accent)] text-white" : "bg-[var(--mc-paper)] border border-[var(--mc-line)] text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"}`}>All products</button>{categories.map((item) => <button type="button" key={item.id} onClick={() => { setCategory(item.slug); setPage(1); }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${category === item.slug ? "bg-[var(--mc-accent)] text-white" : "bg-[var(--mc-paper)] border border-[var(--mc-line)] text-[var(--mc-muted)] hover:text-[var(--mc-ink)]"}`}>{item.name}</button>)}</div>
      </div>

      {error ? <div role="alert" className="mt-6 flex flex-col items-start justify-between gap-3 rounded-lg border border-[#c7d6f0] bg-white p-4 sm:flex-row sm:items-center"><p className="text-[15px] font-semibold text-[var(--mc-ink)]">{error}</p><button type="button" onClick={() => setRequestVersion((version) => version + 1)} className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white"><RefreshCw size={15} />Retry</button></div> : null}
      {loading && !items.length ? <ProductRowsSkeleton /> : null}

      {items.length ? <section className={`mt-5 space-y-3 transition-opacity duration-200 ${loading ? "opacity-60" : "opacity-100"}`}>
        <div className="hidden grid-cols-[minmax(15rem,.9fr)_minmax(18rem,1.1fr)_10rem_minmax(12rem,.7fr)_minmax(16rem,.8fr)] gap-5 px-4 py-2 text-xs font-bold uppercase text-[var(--mc-muted)] xl:grid"><span>Product</span><span>Specification</span><span>Price</span><span>Production</span><span>Actions</span></div>
        {items.map((item) => <article key={item.id} className="grid gap-4 rounded-xl border border-[var(--mc-line)] bg-[var(--mc-paper)] p-4 shadow-[0_5px_16px_rgba(16,33,63,0.035)] sm:grid-cols-2 xl:grid-cols-[minmax(15rem,.9fr)_minmax(18rem,1.1fr)_10rem_minmax(12rem,.7fr)_minmax(16rem,.8fr)] xl:items-center">
          <div className="flex min-w-0 gap-3.5"><Link href={productHref(item)} className="relative h-[76px] w-[92px] shrink-0 overflow-hidden rounded-lg bg-[var(--mc-accent-soft)]"><ProductImage src={item.imageUrl || "/images/mahavir-print-assortment.png"} alt={`${item.name} print sample`} slug={item.slug} /></Link><div className="min-w-0 self-center"><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">{item.category?.name ?? "Print product"}</p><h2 className="mt-1 text-[17px] font-bold leading-snug text-[var(--mc-ink)]"><Link href={productHref(item)} className="hover:text-[var(--mc-accent)] transition-colors">{item.name}</Link></h2></div></div>
          <ProductSpecification item={item} />
          <div>
            <p className="text-xs font-bold uppercase text-[var(--mc-muted)] xl:hidden">Price</p>
            <p className="mt-1 text-[17px] font-bold leading-snug text-[var(--mc-ink)] xl:mt-0">{item.priceLabel}</p>
            {item.taxInclusive ? (
              <p className="mt-0.5 text-xs text-[var(--mc-muted)]">GST included</p>
            ) : item.priceState === "STARTING" ? (
              <p className="mt-0.5 text-xs font-medium text-[var(--mc-muted)]">GST charged additionally as applicable</p>
            ) : null}
          </div>
          <ProductMeta item={item} />
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0 sm:col-span-2 xl:col-span-1">
            <Link href={productHref(item)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm">{item.orderable ? "Order now" : "Configure"} <ArrowRight size={16} /></Link>
          </div>
        </article>)}
        {pagination.totalPages > 1 ? <nav aria-label="Product pages" className="flex items-center justify-between border-t border-[var(--mc-line)] pt-5"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-full border border-[var(--mc-line)] bg-white px-5 py-2.5 text-sm font-bold text-[var(--mc-accent)] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[var(--mc-surface)] transition-colors">Previous</button><p className="text-sm font-semibold text-[var(--mc-muted)]">Page {pagination.page} of {pagination.totalPages}</p><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))} className="rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-[var(--mc-accent-dark)] transition-colors shadow-sm">Next</button></nav> : null}
        <p className="border-t border-[var(--mc-line)] pt-4 text-right text-xs font-medium text-[var(--mc-muted)]">Base prices shown above are exclusive of GST. GST charged additionally as applicable.</p>
      </section> : null}
      {!loading && !items.length && !error ? <div className="mt-5 rounded-xl border border-[var(--mc-line)] bg-[var(--mc-paper)] px-5 py-12 text-center text-[15px] text-[var(--mc-muted)]">No products match these filters.</div> : null}
    </div>
  </main>;
}

function ProductSpecification({ item }: { item: Product }) {
  const artwork = item.artworkSummary;
  const specText = item.listingSpecification && item.listingSpecification.toLowerCase() !== item.name.toLowerCase()
    ? item.listingSpecification
    : null;
  const artworkLabel = artwork?.formatLabel?.toLowerCase().includes("cdr") ? "CDR required" : artwork?.formatLabel ? `${artwork.formatLabel} required` : null;

  return <div className="min-w-0 space-y-1 text-[13px] leading-5 text-[var(--mc-muted)]">
    <p className="text-xs font-bold uppercase text-[var(--mc-muted)] xl:hidden">Specification</p>
    {specText ? <p className="line-clamp-2 text-sm font-medium text-[var(--mc-ink)]">{specText}</p> : null}
    {item.productSize ? <p><strong className="font-semibold text-[var(--mc-ink)]">Size:</strong> {item.productSize}</p> : null}
    {artwork ? <>
      {artworkLabel ? <p className="flex items-center gap-1.5"><FileUp size={14} />{artworkLabel}</p> : null}
      {artwork.fullDesign ? <p><strong className="font-semibold text-[var(--mc-ink)]">Full:</strong> {artwork.fullDesign}</p> : null}
      {artwork.finalSize ? <p><strong className="font-semibold text-[var(--mc-ink)]">Final:</strong> {artwork.finalSize}</p> : null}
    </> : null}
  </div>;
}

function cleanProductionTime(text: string | null) {
  if (!text) return null;
  return text.replace(/\bworking\s*days?\s+working\s*days?\b/gi, "working days").trim();
}

function ProductMeta({ item }: { item: Product }) {
  const prodTime = cleanProductionTime(item.productionTime);
  return <div className="space-y-1 text-[13px] leading-5 text-[var(--mc-muted)]">
    {prodTime ? <p className="inline-flex items-center gap-1.5 font-semibold text-[var(--mc-ink)]"><Clock3 size={14} />{prodTime}</p> : null}
    {item.hasAddons ? <p className="flex items-center gap-1.5"><Sparkles size={14} />Add-on available</p> : null}
  </div>;
}

function ProductRowsSkeleton() {
  return <div className="mt-5 space-y-2.5" aria-label="Loading products">{Array.from({ length: 5 }, (_, index) => <div key={index} className="grid animate-pulse gap-4 rounded-lg border border-[var(--mc-line)] bg-white p-4 sm:grid-cols-[92px_minmax(0,1fr)] xl:grid-cols-[92px_minmax(17rem,1.1fr)_11rem_minmax(17rem,1fr)_17rem]"><div className="h-[76px] rounded-md bg-[#e5ebf5]" /><div className="space-y-2 self-center"><div className="h-3 w-24 rounded bg-[#e5ebf5]" /><div className="h-5 w-48 max-w-full rounded bg-[#dce4f0]" /><div className="h-3 w-64 max-w-full rounded bg-[#e8edf5]" /></div><div className="hidden h-6 w-28 self-center rounded bg-[#e2e8f2] xl:block" /><div className="hidden space-y-2 self-center xl:block"><div className="h-3 w-32 rounded bg-[#e2e8f2]" /><div className="h-3 w-44 rounded bg-[#e8edf5]" /></div><div className="hidden h-10 w-56 self-center rounded-full bg-[#e2e8f2] xl:block" /></div>)}</div>;
}
