"use client";

import { useEffect, useState } from "react";

import { adminRequest } from "@/lib/admin-client";

type Analytics = {
  search: { confidenceBreakdown: Record<string, number>; topNoResultSearches: Array<{ query: string; count: number }>; searchStateDemand: Array<{ state: string; count: number }>; totalSearches: number };
  quotes: { funnel: Record<string, number>; totalQuotes: number; conversionRate: number };
  products: {
    mostOrderedProducts: Array<{ productId: string; name: string; lines: number; totalQuantity: number }>;
    mostReorderedProducts: Array<{ productId: string; name: string; customers: number }>;
    popularQuantities: Array<{ quantity: number; count: number }>;
    stateDemand: Array<{ state: string; count: number }>;
    popularAddons: Array<{ addonId: string; name: string; count: number }>;
  };
};

export function AdminAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminRequest<Analytics>("/api/admin/analytics").then(setData).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load analytics"));
  }, []);

  if (error) return <p className="border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm font-semibold text-[#9b2525]">{error}</p>;
  if (!data) return <p className="text-sm text-[#607089]">Loading...</p>;

  return (
    <div>
      <header><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Business insight</p><h1 className="mt-2 text-2xl font-bold text-[#162237] sm:text-3xl">Analytics</h1></header>

      <section className="mt-6 border border-[#d7dce5] bg-white p-5">
        <h2 className="font-bold text-[#162237]">Search — what customers look for</h2>
        <p className="mt-1 text-sm text-[#607089]">{data.search.totalSearches} searches in the recent window · {data.search.confidenceBreakdown.HIGH ?? 0} matched, {data.search.confidenceBreakdown.PARTIAL ?? 0} partial, {data.search.confidenceBreakdown.NONE ?? 0} no result.</p>
        <h3 className="mt-4 text-sm font-bold text-[#162237]">Top no-result searches — potential missing products</h3>
        <div className="mt-2 divide-y divide-[#e8ecf2]">
          {data.search.topNoResultSearches.length ? data.search.topNoResultSearches.map((row) => <div key={row.query} className="flex justify-between py-2 text-sm"><span>{row.query}</span><strong>{row.count}</strong></div>) : <p className="py-2 text-sm text-[#607089]">No unmatched searches yet.</p>}
        </div>
      </section>

      <section className="mt-6 border border-[#d7dce5] bg-white p-5">
        <h2 className="font-bold text-[#162237]">Quote funnel</h2>
        <p className="mt-1 text-sm text-[#607089]">{data.quotes.totalQuotes} total quotes · {data.quotes.conversionRate}% converted to orders.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {Object.entries(data.quotes.funnel).map(([status, count]) => <div key={status} className="border border-[#e8ecf2] p-3 text-sm"><p className="text-xs font-bold uppercase text-[#607089]">{status.replace(/_/g, " ")}</p><p className="mt-1 text-lg font-bold text-[#162237]">{count}</p></div>)}
        </div>
      </section>

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="border border-[#d7dce5] bg-white p-5">
          <h2 className="font-bold text-[#162237]">Most ordered products</h2>
          <div className="mt-2 divide-y divide-[#e8ecf2]">{data.products.mostOrderedProducts.map((row) => <div key={row.productId} className="flex justify-between py-2 text-sm"><span>{row.name}</span><strong>{row.lines} orders</strong></div>)}</div>
        </div>
        <div className="border border-[#d7dce5] bg-white p-5">
          <h2 className="font-bold text-[#162237]">Most reordered products</h2>
          <div className="mt-2 divide-y divide-[#e8ecf2]">{data.products.mostReorderedProducts.length ? data.products.mostReorderedProducts.map((row) => <div key={row.productId} className="flex justify-between py-2 text-sm"><span>{row.name}</span><strong>{row.customers} repeat customers</strong></div>) : <p className="py-2 text-sm text-[#607089]">No repeat orders yet.</p>}</div>
        </div>
        <div className="border border-[#d7dce5] bg-white p-5">
          <h2 className="font-bold text-[#162237]">Popular add-ons</h2>
          <div className="mt-2 divide-y divide-[#e8ecf2]">{data.products.popularAddons.length ? data.products.popularAddons.map((row) => <div key={row.addonId} className="flex justify-between py-2 text-sm"><span>{row.name}</span><strong>{row.count}</strong></div>) : <p className="py-2 text-sm text-[#607089]">No add-on data yet.</p>}</div>
        </div>
        <div className="border border-[#d7dce5] bg-white p-5">
          <h2 className="font-bold text-[#162237]">State demand (orders)</h2>
          <div className="mt-2 divide-y divide-[#e8ecf2]">{data.products.stateDemand.length ? data.products.stateDemand.map((row) => <div key={row.state} className="flex justify-between py-2 text-sm"><span>{row.state}</span><strong>{row.count}</strong></div>) : <p className="py-2 text-sm text-[#607089]">No delivery-state data yet.</p>}</div>
        </div>
      </section>
    </div>
  );
}
