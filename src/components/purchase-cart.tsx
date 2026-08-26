"use client";

import Link from "next/link";
import { ArrowRight, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type Item = { id: string; productId: string; quantity: number; configuration: Record<string, string>; product: { name: string; slug: string } };

export function PurchaseCart() {
  const [items, setItems] = useState<Item[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  useEffect(() => { async function load() { try { const response = await fetch("/api/cart?kind=PURCHASE", { cache: "no-store" }); const payload = await response.json(); if (response.status === 401) throw new Error("Sign in to view your purchase basket."); if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Could not load your basket"); setItems(payload.data.items); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your basket"); } finally { setLoading(false); } } void load(); }, []);
  async function remove(id: string) { const response = await fetch(`/api/cart/items/${id}`, { method: "DELETE" }); if (response.ok) setItems((current) => current.filter((item) => item.id !== id)); }
  if (loading) return <p className="py-12 text-sm text-[#646b64]">Loading basket...</p>;
  if (error) return <div className="border border-[#e9c4bd] bg-[#fff4f1] p-5 text-sm text-[#8b2f24]">{error}<Link href="/login" className="ml-2 font-bold underline">Sign in</Link></div>;
  return <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_330px]"><section className="space-y-3">{items.length ? items.map((item) => <article key={item.id} className="flex gap-4 border border-[#d8d6cf] bg-white p-4"><div className="min-w-0 flex-1"><p className="font-bold">{item.product.name}</p><p className="mt-1 text-xs leading-5 text-[#687069]">Qty {item.quantity} / {Object.entries(item.configuration).filter(([key]) => key !== "quantity").map(([key, value]) => `${key}: ${value}`).join(" / ")}</p><p className="mt-2 text-xs text-[#687069]">Price is revalidated by the server at checkout.</p></div><button type="button" onClick={() => void remove(item.id)} className="grid size-8 place-items-center text-[#8b2f24]" aria-label={`Remove ${item.product.name}`}><Trash2 size={17} /></button></article>) : <div className="border border-dashed border-[#c9c7bf] bg-white p-8"><h2 className="font-bold">Your purchase basket is empty.</h2><Link href="/catalog" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#8b2f24]">Browse products <ArrowRight size={16} /></Link></div>}</section><aside className="h-fit border border-[#d8d6cf] bg-white p-5"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#747b74]">Purchase basket</p><p className="mt-4 text-sm text-[#687069]">{items.length} line{items.length === 1 ? "" : "s"}. Exact pricing is calculated again when you checkout.</p><Link href="/checkout" className={`mt-5 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold ${items.length ? "bg-[#8b2f24] text-white" : "pointer-events-none bg-[#dedcd5] text-[#80877f]"}`}>Checkout <ArrowRight size={16} /></Link></aside></div>;
}
