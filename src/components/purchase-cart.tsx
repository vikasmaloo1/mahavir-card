"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProductImage } from "@/components/product-image";
import { formatInr, formatRoundOff } from "@/lib/formatting";
import { stepProductQuantity } from "@/lib/quantity-helper";
import { useAutoRefresh } from "@/lib/use-auto-refresh";

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
type CartData = { items: Item[]; summary: { productSubtotal?: string; addonSubtotal?: string; deliverySubtotal?: string; surchargeSubtotal?: string; priceBeforeTax: string; tax: string; roundOff?: string; total: string; taxInclusive: boolean; hasTaxBreakdown: boolean; hasUnavailableItems: boolean } };

const money = formatInr;

export function PurchaseCart() {
  const [data, setData] = useState<CartData>({ items: [], summary: { priceBeforeTax: "0.00", tax: "0.00", total: "0.00", taxInclusive: true, hasTaxBreakdown: false, hasUnavailableItems: false } });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/cart?kind=PURCHASE&_t=${Date.now()}`, { cache: "no-store" });
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

  useAutoRefresh(load);

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
    <section className="space-y-4">
      {data.items.length ? (
        <div className="flex items-center justify-between">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#1e3a5f] hover:underline"
          >
            <Plus size={14} /> Add more products
          </Link>
          <button
            type="button"
            onClick={() => void clear()}
            disabled={Boolean(busyId)}
            className="text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-red-700 transition-colors"
          >
            Clear Basket
          </button>
        </div>
      ) : null}
      {data.items.length ? (
        data.items.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5 transition hover:border-slate-300"
          >
            <div className="flex gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:size-20">
                <ProductImage src={null} alt={item.product.name} slug={item.product.slug} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-900 sm:text-lg">{item.product.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{item.pricingSnapshot.applicableRule ?? "Configured print job"}</p>
                  </div>
                  <p className="text-lg font-bold text-[#1e3a5f]">
                    {item.calculatedAmount ? money(item.calculatedAmount) : "Unavailable"}
                  </p>
                </div>
                {item.pricingSnapshot.addons?.length || item.pricingSnapshot.delivery?.method ? (
                  <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {item.pricingSnapshot.addons?.length ? (
                      <span>
                        Add-ons:{" "}
                        {item.pricingSnapshot.addons
                          .map((addon) => (addon.price ? `${addon.name} (${money(addon.price)})` : addon.name))
                          .join(", ")}
                      </span>
                    ) : null}
                    {item.pricingSnapshot.delivery?.method ? (
                      <span>Delivery: {item.pricingSnapshot.delivery.method.replaceAll("_", " ")}</span>
                    ) : null}
                  </div>
                ) : null}
                {!item.available ? (
                  <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-900 border border-amber-200/60">
                    {item.message}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Qty:</span>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => void updateQuantity(item, "DOWN")}
                      disabled={busyId === item.id || item.quantity <= 500}
                      className="grid size-8 place-items-center rounded-l-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="min-w-14 text-center text-xs font-bold text-slate-900">
                      {item.quantity.toLocaleString("en-IN")}
                    </span>
                    <button
                      type="button"
                      onClick={() => void updateQuantity(item, "UP")}
                      disabled={busyId === item.id}
                      className="grid size-8 place-items-center rounded-r-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
                      aria-label="Increase quantity"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <Link
                    href={`/catalog/${item.product.slug}?editItem=${item.id}&kind=PURCHASE`}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#1e3a5f] hover:bg-slate-50 transition-colors"
                  >
                    <Pencil size={12} /> Edit Options
                  </Link>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    disabled={busyId === item.id}
                    className="grid size-8 place-items-center rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                    aria-label={`Remove ${item.product.name}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))
      ) : (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-10 text-center shadow-xs">
          <div className="relative mx-auto size-24 overflow-hidden rounded-2xl border border-slate-200 shadow-xs">
            <Image src="/images/empty-state-print.jpg" alt="Blank print sheet" fill className="object-cover" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">Your purchase basket is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
            Select a commercial print product with live calculation to begin your order.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-6 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-[#152a45]"
          >
            Browse Products <ArrowRight size={16} />
          </Link>
        </div>
      )}
      {error ? (
        <p role="alert" className="rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm font-semibold text-red-900">
          {error}
        </p>
      ) : null}
    </section>
    <aside className="h-fit rounded-2xl border border-slate-200/90 bg-white p-6 xl:sticky xl:top-[120px] shadow-xs">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Purchase Basket Summary</p>
      <div className="mt-4 border-y border-slate-100 py-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-500">
            {data.items.length} item{data.items.length === 1 ? "" : "s"}
          </span>
          <strong className="text-2xl font-black text-slate-950">{money(data.summary.total)}</strong>
        </div>
        {data.summary.hasTaxBreakdown ? (
          <div className="mt-3.5 space-y-2 border-t border-slate-100 pt-3.5 text-xs text-slate-600">
            <p className="flex justify-between">
              <span>Base products:</span>
              <strong className="text-slate-900">{money(data.summary.productSubtotal)}</strong>
            </p>
            {Number(data.summary.addonSubtotal) > 0 ? (
              <p className="flex justify-between">
                <span>Add-ons / Finishing:</span>
                <strong className="text-slate-900">{money(data.summary.addonSubtotal)}</strong>
              </p>
            ) : null}
            {Number(data.summary.deliverySubtotal) > 0 ? (
              <p className="flex justify-between">
                <span>Courier dispatch:</span>
                <strong className="text-slate-900">{money(data.summary.deliverySubtotal)}</strong>
              </p>
            ) : null}
            <p className="flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
              <span>Taxable subtotal:</span>
              <strong>{money(data.summary.priceBeforeTax)}</strong>
            </p>
            <p className="flex justify-between">
              <span>GST (18%):</span>
              <strong className="text-slate-900">{money(data.summary.tax)}</strong>
            </p>
            {data.summary.roundOff && Math.abs(Number(data.summary.roundOff)) > 0.001 ? (
              <p className="flex justify-between text-xs text-slate-500">
                <span>Paisa adjustment (Round off):</span>
                <strong className={Number(data.summary.roundOff) < 0 ? "text-emerald-700" : "text-slate-700"}>
                  {formatRoundOff(data.summary.roundOff)}
                </strong>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      {data.summary.taxInclusive ? (
        <p className="mt-3 text-[11px] text-slate-400">Total includes all applicable GST/taxes.</p>
      ) : null}
      <Link
        href="/checkout"
        className={`mt-6 flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold shadow-xs transition ${
          data.items.length && !data.summary.hasUnavailableItems
            ? "bg-[#1e3a5f] text-white hover:bg-[#152a45]"
            : "pointer-events-none bg-slate-100 text-slate-400"
        }`}
      >
        Proceed to Checkout <ArrowRight size={16} />
      </Link>
      <Link
        href="/quote"
        className="mt-3 block text-center text-xs font-bold text-slate-500 hover:text-[#1e3a5f] transition-colors"
      >
        Open Custom Quote Basket
      </Link>
    </aside>
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
