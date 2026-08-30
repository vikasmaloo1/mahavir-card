"use client";

import Link from "next/link";
import { ArrowRight, Minus, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { formatInr } from "@/lib/formatting";

type Item = {
  id: string;
  productId: string;
  quantity: number;
  configuration: Record<string, unknown>;
  calculatedAmount: string | null;
  available: boolean;
  message: string | null;
  pricingSnapshot: { applicableRule?: string | null; addons?: Array<{ name: string }>; delivery?: { method?: string | null } };
  product: { name: string; slug: string };
};
type CartData = { items: Item[]; summary: { total: string; taxInclusive: boolean; hasUnavailableItems: boolean } };

const money = formatInr;

export function PurchaseCart() {
  const [data, setData] = useState<CartData>({ items: [], summary: { total: "0.00", taxInclusive: true, hasUnavailableItems: false } });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/cart?kind=PURCHASE", { cache: "no-store" });
      const payload = await response.json();
      if (response.status === 401) throw new Error("Sign in to view your purchase basket.");
      if (!response.ok || !payload.success) throw new Error(payload.error?.message ?? "Could not load your basket");
      setData(payload.data);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load your basket");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function updateQuantity(item: Item, quantity: number) {
    setBusyId(item.id); setError("");
    const response = await fetch(`/api/cart/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: Math.max(1, quantity) }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) setError(payload?.error?.message ?? "Could not update this item");
    else await load();
    setBusyId("");
  }

  async function remove(id: string) {
    setBusyId(id);
    const response = await fetch(`/api/cart/items/${id}`, { method: "DELETE" });
    if (response.ok) await load(); else setError("Could not remove this item");
    setBusyId("");
  }

  async function clear() {
    setBusyId("all");
    const response = await fetch("/api/cart?kind=PURCHASE", { method: "DELETE" });
    if (response.ok) await load(); else setError("Could not clear your basket");
    setBusyId("");
  }

  if (loading) return <p className="py-12 text-sm text-[var(--mc-muted)]">Loading basket...</p>;
  if (error && !data.items.length) return <div className="rounded-lg border border-[#efb7b7] bg-[#fff4f4] p-5 text-sm text-[#9b2525]">{error}<Link href="/login" className="ml-2 font-bold underline">Sign in</Link></div>;

  return <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
    <section className="space-y-3">
      {data.items.length ? <div className="flex justify-end"><button type="button" onClick={() => void clear()} disabled={Boolean(busyId)} className="text-sm font-bold text-[var(--mc-muted)] hover:text-[var(--mc-accent)]">Clear basket</button></div> : null}
      {data.items.length ? data.items.map((item) => <article key={item.id} className="rounded-lg border border-[var(--mc-line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex gap-4"><div className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><ShoppingBag size={19} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-lg font-bold">{item.product.name}</p><p className="mt-1 text-sm text-[var(--mc-muted)]">{item.pricingSnapshot.applicableRule ?? "Configured print job"}</p></div><p className="text-lg font-bold text-[var(--mc-accent-dark)]">{item.calculatedAmount ? money(item.calculatedAmount) : "Unavailable"}</p></div>
          {item.pricingSnapshot.addons?.length || item.pricingSnapshot.delivery?.method ? <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--mc-muted)]">{item.pricingSnapshot.addons?.length ? <span>{item.pricingSnapshot.addons.map((addon) => addon.name).join(", ")}</span> : null}{item.pricingSnapshot.delivery?.method ? <span>{item.pricingSnapshot.delivery.method.replaceAll("_", " ")}</span> : null}</div> : null}
          {!item.available ? <p className="mt-3 rounded-lg bg-[#fff7e8] p-3 text-sm font-semibold text-[#805910]">{item.message}</p> : null}
          <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 text-sm font-semibold">Quantity</span><button type="button" onClick={() => void updateQuantity(item, item.quantity - 1)} disabled={busyId === item.id || item.quantity <= 1} className="grid size-9 place-items-center rounded-full border border-[var(--mc-line)]" aria-label="Decrease quantity"><Minus size={14} /></button><span className="min-w-12 text-center text-sm font-bold">{item.quantity.toLocaleString("en-IN")}</span><button type="button" onClick={() => void updateQuantity(item, item.quantity + 1)} disabled={busyId === item.id} className="grid size-9 place-items-center rounded-full border border-[var(--mc-line)]" aria-label="Increase quantity"><Plus size={14} /></button><Link href={`/catalog/${item.product.slug}?editItem=${item.id}&kind=PURCHASE`} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-line)] px-3 py-2 text-sm font-bold text-[var(--mc-accent)]"><Pencil size={14} />Edit options</Link><button type="button" onClick={() => void remove(item.id)} disabled={busyId === item.id} className="grid size-9 place-items-center rounded-full text-[#a53025]" aria-label={`Remove ${item.product.name}`}><Trash2 size={17} /></button></div>
        </div></div>
      </article>) : <div className="rounded-lg border border-dashed border-[var(--mc-line)] bg-white p-8"><h2 className="font-bold">Your purchase basket is empty.</h2><p className="mt-2 text-sm text-[var(--mc-muted)]">Add an orderable product with an exact server price.</p><Link href="/products" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--mc-accent)]">Browse products <ArrowRight size={16} /></Link></div>}
      {error ? <p role="alert" className="rounded-lg border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm text-[#9b2525]">{error}</p> : null}
    </section>
    <aside className="h-fit rounded-lg border border-[var(--mc-line)] bg-white p-5 xl:sticky xl:top-[116px]"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">Purchase basket</p><div className="mt-5 flex justify-between border-y border-[var(--mc-line)] py-4"><span>{data.items.length} line{data.items.length === 1 ? "" : "s"}</span><strong className="text-xl">{money(data.summary.total)}</strong></div>{data.summary.taxInclusive ? <p className="mt-3 text-xs text-[var(--mc-muted)]">Price includes applicable GST/taxes.</p> : null}<Link href="/checkout" className={`mt-5 flex items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-bold ${data.items.length && !data.summary.hasUnavailableItems ? "bg-[var(--mc-accent)] text-white hover:bg-[var(--mc-accent-dark)]" : "pointer-events-none bg-[#dfe7f4] text-[#74839a]"}`}>Checkout <ArrowRight size={16} /></Link><Link href="/quote" className="mt-3 block text-center text-sm font-bold text-[var(--mc-muted)]">Open quote basket</Link></aside>
  </div>;
}
