"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Suspense } from "react";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { ProductCard } from "@/components/product-card";
import { StorefrontHeader } from "@/components/storefront-header";
import { catalogCategories, catalogProducts } from "@/lib/catalog";

export default function CatalogPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#f8f7f3] p-10 text-sm text-[#646b64]">Loading catalogue...</div>}><CatalogContent /></Suspense>;
}

function CatalogContent() {
  const params = useSearchParams();
  const initialCategory = params.get("category") ?? "all";
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [category, setCategory] = useState(initialCategory);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return catalogProducts.filter((product) => {
      const matchesCategory = category === "all" || product.categorySlug === category;
      const matchesQuery = !normalizedQuery || [product.name, product.category, product.shortDescription, ...product.tags].join(" ").toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  return (
    <main className="min-h-screen bg-[#f8f7f3] text-[#18231e]"><StorefrontHeader /><div className="mx-auto max-w-[1440px] px-5 py-10 xl:px-10 xl:py-14"><div className="flex flex-col justify-between gap-6 border-b border-[#ddd9d0] pb-8 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f15a3a]">The catalogue</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.06em] sm:text-5xl">Find the right print job.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#626861]">Browse practical products, compare starting points, and configure the details before you request a quote.</p></div><span className="text-sm text-[#777d76]">{filteredProducts.length} products</span></div><div className="mt-8 grid gap-10 xl:grid-cols-[220px_1fr]"><aside className="xl:sticky xl:top-5 xl:self-start"><div className="flex items-center justify-between"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]"><SlidersHorizontal size={15} /> Filter by</p>{category !== "all" && <button type="button" onClick={() => setCategory("all")} className="text-xs font-semibold text-[#f15a3a]">Clear</button>}</div><div className="mt-4 flex gap-2 overflow-x-auto xl:block xl:space-y-1">{[{ name: "All products", slug: "all" }, ...catalogCategories].map((item) => <button type="button" key={item.slug} onClick={() => setCategory(item.slug)} className={`whitespace-nowrap px-3 py-2 text-left text-sm font-semibold xl:block xl:w-full ${category === item.slug ? "bg-[#18231e] text-white" : "text-[#626861] hover:bg-[#eeece4]"}`}>{item.name}</button>)}</div><div className="mt-8 hidden border-t border-[#ddd9d0] pt-6 text-sm leading-6 text-[#626861] xl:block"><p className="font-bold text-[#18231e]">Need something specific?</p><p className="mt-2">Tell us the size, quantity, and finish. We will help you choose the right route.</p><a href="/quote" className="mt-4 inline-block font-bold text-[#f15a3a]">Request custom work</a></div></aside><section><div className="mb-6 flex items-center gap-3 border border-[#d9d6ce] bg-white px-3"><Search size={17} className="text-[#777d76]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or use cases" className="w-full bg-transparent py-3 text-sm outline-none" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} /></button>}</div>{filteredProducts.length > 0 ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="border border-dashed border-[#cfcfc6] bg-white px-6 py-16 text-center"><h2 className="text-xl font-bold">No product matches that search.</h2><p className="mt-2 text-sm text-[#626861]">Try another term or ask us for a custom quote.</p><a href="/quote" className="mt-5 inline-block bg-[#f15a3a] px-4 py-3 text-sm font-bold text-white">Request a quote</a></div>}</section></div></div></main>
  );
}
