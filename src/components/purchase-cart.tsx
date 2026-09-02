"use client";

import Link from "next/link";
import { ArrowRight, Minus, Pencil, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { formatInr } from "@/lib/formatting";
import { stepProductQuantity } from "@/lib/quantity-helper";

type Item = {
  id: string;
  productId: string;
  quantity: number;
  configuration: Record<string, unknown>;
  calculatedAmount: string | null;
  available: boolean;
  message: string | null;
  pricingSnapshot: { applicableRule?: string | null; addons?: Array<{ name: string; price?: string }>; delivery?: { method?: string | null } };
  product: { name: string; slug: string; categorySlug?: string };
};
type CartData = { items: Item[]; summary: { productSubtotal?: string; addonSubtotal?: string; deliverySubtotal?: string; surchargeSubtotal?: string; priceBeforeTax: string; tax: string; total: string; taxInclusive: boolean; hasTaxBreakdown: boolean; hasUnavailableItems: boolean } };

const money = formatInr;

export function PurchaseCart() {
  const [data, setData] = useState<CartData>({ items: [], summary: { priceBeforeTax: "0.00", tax: "0.00", total: "0.00", taxInclusive: true, hasTaxBreakdown: false, hasUnavailableItems: false } });
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

  async function updateQuantity(item: Item, direction: "UP" | "DOWN") {
    const nextQty = stepProductQuantity(item.quantity, direction, item.product.categorySlug, item.product.slug);
    if (nextQty === item.quantity) return;
    setBusyId(item.id); setError("");
    const response = await fetch(`/api/cart/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: nextQty }) });
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

  if (loading) return <CartSkeleton />;
  if (error && !data.items.length) return <div className="mt-6 rounded-xl border border-[#efb7b7] bg-[#fff4f4] p-5 text-sm text-[#9b2525]">{error}<Link href="/login" className="ml-2 font-bold underline">Sign in</Link></div>;

  return <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">
    <section className="space-y-3">
      {data.items.length ? <div className="flex justify-end"><button type="button" onClick={() => void clear()} disabled={Boolean(busyId)} className="text-sm font-bold text-[var(--mc-muted)] hover:text-[var(--mc-accent)] transition-colors">Clear basket</button></div> : null}
      {data.items.length ? data.items.map((item) => <article key={item.id} className="rounded-xl border border-[var(--mc-line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="flex gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><ShoppingBag size={19} /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-[var(--mc-ink)]">{item.product.name}</p>
                <p className="mt-0.5 text-sm text-[var(--mc-muted)]">{item.pricingSnapshot.applicableRule ?? "Configured print job"}</p>
              </div>
              <p className="text-lg font-bold text-[var(--mc-accent-dark)]">{item.calculatedAmount ? money(item.calculatedAmount) : "Unavailable"}</p>
            </div>
            {item.pricingSnapshot.addons?.length || item.pricingSnapshot.delivery?.method ? <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--mc-muted)]">{item.pricingSnapshot.addons?.length ? <span>Add-ons: {item.pricingSnapshot.addons.map((addon) => addon.price ? `${addon.name} (${money(addon.price)})` : addon.name).join(", ")}</span> : null}{item.pricingSnapshot.delivery?.method ? <span>Delivery: {item.pricingSnapshot.delivery.method.replaceAll("_", " ")}</span> : null}</div> : null}
            {!item.available ? <p className="mt-3 rounded-lg bg-[#fff7e8] p-3 text-sm font-semibold text-[#805910]">{item.message}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--mc-line)]">
              <span className="mr-1 text-sm font-semibold text-[var(--mc-muted)]">Qty</span>
              <div className="flex items-center rounded-lg border border-[var(--mc-line)] bg-white">
                <button type="button" onClick={() => void updateQuantity(item, "DOWN")} disabled={busyId === item.id || item.quantity <= 500} className="grid size-8 place-items-center rounded-l-lg hover:bg-[#f3f6fa] disabled:opacity-40 transition-colors" aria-label="Decrease quantity"><Minus size={13} /></button>
                <span className="min-w-14 text-center text-sm font-bold text-[var(--mc-ink)]">{item.quantity.toLocaleString("en-IN")}</span>
                <button type="button" onClick={() => void updateQuantity(item, "UP")} disabled={busyId === item.id} className="grid size-8 place-items-center rounded-r-lg hover:bg-[#f3f6fa] disabled:opacity-40 transition-colors" aria-label="Increase quantity"><Plus size={13} /></button>
              </div>
              <Link href={`/catalog/${item.product.slug}?editItem=${item.id}&kind=PURCHASE`} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-line)] px-3 py-1.5 text-xs font-bold text-[var(--mc-accent)] hover:bg-[var(--mc-surface)] transition-colors"><Pencil size={13} />Edit options</Link>
              <button type="button" onClick={() => void remove(item.id)} disabled={busyId === item.id} className="grid size-8 place-items-center rounded-full text-[#a53025] hover:bg-[#fff4f4] transition-colors" aria-label={`Remove ${item.product.name}`}><Trash2 size={16} /></button>
            </div>
          </div>
        </div>
      </article>) : <div className="rounded-xl border border-dashed border-[var(--mc-line)] bg-white p-8 text-center"><h2 className="font-bold text-lg text-[var(--mc-ink)]">Your purchase basket is empty.</h2><p className="mt-2 text-sm text-[var(--mc-muted)]">Add an orderable product with live pricing to get started.</p><Link href="/products" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors">Browse products <ArrowRight size={16} /></Link></div>}
      {error ? <p role="alert" className="rounded-xl border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm text-[#9b2525]">{error}</p> : null}
    </section>
    <aside className="h-fit rounded-xl border border-[var(--mc-line)] bg-white p-5 xl:sticky xl:top-[116px] shadow-sm"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">Purchase basket</p><div className="mt-4 border-y border-[var(--mc-line)] py-4"><div className="flex justify-between items-center"><span className="text-sm font-semibold text-[var(--mc-muted)]">{data.items.length} line{data.items.length === 1 ? "" : "s"}</span><strong className="text-2xl text-[var(--mc-ink)]">{money(data.summary.total)}</strong></div>{data.summary.hasTaxBreakdown ? <div className="mt-3 space-y-1.5 border-t border-[var(--mc-line)] pt-3 text-sm text-[var(--mc-muted)]"><p className="flex justify-between"><span>Base products</span><strong className="text-[var(--mc-ink)]">{money(data.summary.productSubtotal)}</strong></p>{Number(data.summary.addonSubtotal) > 0 ? <p className="flex justify-between"><span>Add-ons / extras</span><strong className="text-[var(--mc-ink)]">{money(data.summary.addonSubtotal)}</strong></p> : null}{Number(data.summary.deliverySubtotal) > 0 ? <p className="flex justify-between"><span>Courier</span><strong className="text-[var(--mc-ink)]">{money(data.summary.deliverySubtotal)}</strong></p> : null}<p className="flex justify-between border-t border-[var(--mc-line)] pt-1.5 font-medium text-[var(--mc-ink)]"><span>Taxable subtotal</span><strong>{money(data.summary.priceBeforeTax)}</strong></p><p className="flex justify-between"><span>GST</span><strong className="text-[var(--mc-ink)]">{money(data.summary.tax)}</strong></p></div> : null}</div>{data.summary.taxInclusive ? <p className="mt-3 text-xs text-[var(--mc-muted)]">Price includes applicable GST/taxes.</p> : null}<Link href="/checkout" className={`mt-5 flex items-center justify-center gap-2 rounded-full px-4 py-3.5 text-sm font-bold shadow-sm transition-colors ${data.items.length && !data.summary.hasUnavailableItems ? "bg-[var(--mc-accent)] text-white hover:bg-[var(--mc-accent-dark)]" : "pointer-events-none bg-[#dfe7f4] text-[#74839a]"}`}>Checkout <ArrowRight size={16} /></Link><Link href="/quote" className="mt-3 block text-center text-sm font-bold text-[var(--mc-muted)] hover:text-[var(--mc-ink)] transition-colors">Open quote basket</Link></aside>
  </div>;
}

function CartSkeleton() {
  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_350px] animate-pulse">
      <div className="space-y-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="rounded-xl border border-[var(--mc-line)] bg-white p-5 h-36 flex gap-4">
            <div className="size-11 rounded-lg bg-[#e5ebf5] shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-5 w-48 rounded bg-[#dce4f0]" />
              <div className="h-4 w-32 rounded bg-[#e8edf5]" />
              <div className="h-8 w-28 rounded bg-[#e5ebf5] mt-4" />
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[var(--mc-line)] bg-white p-5 h-64" />
    </div>
  );
}
