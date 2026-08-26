"use client";

import Link from "next/link";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StorefrontHeader } from "@/components/storefront-header";

type CartItem = { productId: string; slug: string; name: string; configuration: Record<string, string>; quantity: number; calculatedAmount: string };

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { try { // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(JSON.parse(window.localStorage.getItem("mahavir-purchase-cart") ?? "[]")); } catch {} }, []);
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(item.calculatedAmount), 0), [items]);
  function save(next: CartItem[]) { setItems(next); window.localStorage.setItem("mahavir-purchase-cart", JSON.stringify(next)); }
  return <main className="min-h-screen bg-[#fcfbf8] text-[#17221c]"><StorefrontHeader /><div className="mx-auto max-w-[1120px] px-4 py-8 xl:px-8"><div className="flex items-end justify-between border-b border-[#dedcd5] pb-5"><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#8b2f24]">Purchase basket</p><h1 className="mt-2 text-3xl font-bold">Ready-to-print orders.</h1></div><Link href="/quote" className="text-sm font-bold text-[#8b2f24]">Need a quote instead?</Link></div><div className="mt-6 grid gap-6 xl:grid-cols-[1fr_330px]"><section className="space-y-3">{items.length ? items.map((item, index) => <article key={`${item.productId}-${index}`} className="flex gap-4 border border-[#d8d6cf] bg-white p-4"><div className="grid size-12 shrink-0 place-items-center bg-[#eef0eb] text-[#8b2f24]"><ShoppingBag size={19} /></div><div className="min-w-0 flex-1"><p className="font-bold">{item.name}</p><p className="mt-1 text-xs leading-5 text-[#687069]">{Object.entries(item.configuration).filter(([key]) => key !== "quantity").map(([key, value]) => `${key}: ${value}`).join(" · ")}</p><p className="mt-2 text-sm font-bold">Rs {Number(item.calculatedAmount).toLocaleString("en-IN")}</p></div><button type="button" onClick={() => save(items.filter((_, itemIndex) => itemIndex !== index))} className="grid size-8 place-items-center text-[#8b2f24]" aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button></article>) : <div className="border border-dashed border-[#c9c7bf] bg-white p-8"><h2 className="font-bold">Your purchase basket is empty.</h2><p className="mt-2 text-sm text-[#687069]">Only items with an exact approved price can be placed here.</p><Link href="/catalog" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#8b2f24]">Browse products <ArrowRight size={16} /></Link></div>}</section><aside className="h-fit border border-[#d8d6cf] bg-white p-5 xl:sticky xl:top-[108px]"><p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#747b74]">Order total</p><div className="mt-5 flex justify-between border-y border-[#ebe9e3] py-4 text-sm"><span>{items.length} line{items.length === 1 ? "" : "s"}</span><strong>Rs {total.toLocaleString("en-IN")}</strong></div><Link href="/checkout" className={`mt-5 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold ${items.length ? "bg-[#8b2f24] text-white hover:bg-[#17221c]" : "pointer-events-none bg-[#dedcd5] text-[#80877f]"}`}>Checkout <ArrowRight size={16} /></Link><p className="mt-3 text-xs leading-5 text-[#747b74]">Quote-only work stays separate in the quote basket.</p></aside></div></div></main>;
}
