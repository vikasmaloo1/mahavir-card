"use client";

import { ArrowRight, Check, FileUp, Minus, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CatalogProduct } from "@/lib/catalog";

type Estimate = { calculatedAmount: string | null; warnings: string[]; applicableRule?: string | null };
type QuoteItem = { productId: string; slug: string; name: string; configuration: Record<string, string> };

export function ProductConfigurator({ product }: { product: CatalogProduct }) {
  const router = useRouter();
  const defaults = useMemo(() => Object.fromEntries(product.configuration.map((field) => [field.id, field.defaultValue])), [product.configuration]);
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [estimate, setEstimate] = useState<Estimate>({ calculatedAmount: null, warnings: [] });
  const [status, setStatus] = useState<"idle" | "quote" | "cart">("idle");
  const [basketError, setBasketError] = useState("");
  const [artwork, setArtwork] = useState("");
  const quantity = Math.max(1, Number(values.quantity || 1));
  const directReady = product.orderable && Boolean(estimate.calculatedAmount) && estimate.warnings.length === 0;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/pricing/calculate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: product.id, quantity, options: values }), signal: controller.signal })
      .then((response) => response.json())
      .then((result) => { if (result.success) setEstimate(result.data); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [product.id, quantity, values]);

  function update(id: string, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
    setStatus("idle");
  }

  function quoteItem(): QuoteItem {
    return { productId: product.id, slug: product.slug, name: product.name, configuration: { ...values, ...(artwork ? { artwork } : {}) } };
  }

  async function addToQuote() {
    setBasketError("");
    const response = await fetch("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "QUOTE", productId: product.id, quantity, configuration: quoteItem().configuration }) });
    const payload = await response.json();
    if (!response.ok) { setBasketError(response.status === 401 ? "Sign in to save a quote basket." : payload.error?.message ?? "Could not add this item to your quote basket."); return; }
    setStatus("quote");
  }

  async function addToCart(goToCheckout = false) {
    if (!directReady || !estimate.calculatedAmount) return;
    setBasketError("");
    const response = await fetch("/api/cart/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "PURCHASE", productId: product.id, quantity, configuration: quoteItem().configuration }) });
    const payload = await response.json();
    if (!response.ok) { setBasketError(response.status === 401 ? "Sign in to save a purchase basket." : payload.error?.message ?? "Could not add this item to your purchase basket."); return; }
    setStatus("cart");
    if (goToCheckout) router.push("/checkout");
  }

  return <section className="border border-[#d8d6cf] bg-white">
    <div className="border-b border-[#e8e6e0] px-5 py-4"><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b2f24]">Configure your order</p><p className="mt-1 text-sm text-[#626a62]">The total is requested from the pricing API, never calculated in the browser.</p></div>
    <div className="space-y-5 p-5">{product.configuration.map((field) => <label key={field.id} className="block"><span className="mb-2 block text-xs font-bold text-[#28342b]">{field.label}{field.suffix ? ` (${field.suffix})` : ""}</span>{field.type === "select" ? <select value={values[field.id]} onChange={(event) => update(field.id, event.target.value)} className="w-full border border-[#d8d6cf] bg-[#fcfbf8] px-3 py-3 text-sm outline-none focus:border-[#8b2f24]">{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : <div className="flex items-center border border-[#d8d6cf] bg-[#fcfbf8]"><input type={field.type} min={1} value={values[field.id]} onChange={(event) => update(field.id, event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm outline-none" />{field.type === "number" && <div className="flex gap-1 pr-2"><button type="button" onClick={() => update(field.id, String(Math.max(1, Number(values[field.id] || 1) - 1)))} className="grid size-7 place-items-center border border-[#d8d6cf]" aria-label={`Decrease ${field.label}`}><Minus size={14} /></button><button type="button" onClick={() => update(field.id, String(Number(values[field.id] || 1) + 1))} className="grid size-7 place-items-center border border-[#d8d6cf]" aria-label={`Increase ${field.label}`}><Plus size={14} /></button></div>}</div>}</label>)}
      <label className="flex cursor-pointer items-center gap-3 border border-dashed border-[#c9c7bf] bg-[#fcfbf8] p-3 text-sm text-[#59625b]"><FileUp size={17} className="text-[#8b2f24]" /><span><strong className="block text-[#29342c]">CDR artwork</strong>Accepted file: CorelDRAW (.cdr)</span><input type="file" className="sr-only" accept=".cdr" onChange={(event) => setArtwork(event.target.files?.[0]?.name ?? "")} /></label>{artwork && <p className="text-xs text-[#687069]">{artwork} selected. It will be reviewed with your order.</p>}
      <div className="border-t border-[#e8e6e0] pt-5"><div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#747b74]">Your price</p><p className="mt-1 text-2xl font-bold text-[#17221c]">{estimate.calculatedAmount ? `Rs ${Number(estimate.calculatedAmount).toLocaleString("en-IN")}` : "Checking price..."}</p></div><span className="text-right text-xs text-[#747b74]">{estimate.applicableRule ?? "Server pricing"}</span></div>{estimate.warnings[0] && <p className="mt-3 border-l-2 border-[#b77b1c] pl-3 text-xs leading-5 text-[#805910]">{estimate.warnings[0]} Request a quote for the confirmed amount.</p>}</div>
      {basketError ? <p className="text-sm text-[#8b2f24]">{basketError}</p> : null}
      {directReady && <div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => void addToCart(true)} className="flex items-center justify-center gap-2 bg-[#8b2f24] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#17221c]">Buy now <ArrowRight size={16} /></button><button type="button" onClick={() => void addToCart()} className="flex items-center justify-center gap-2 border border-[#17221c] px-4 py-3.5 text-sm font-bold text-[#17221c] hover:bg-[#f4f2ed]"><ShoppingBag size={16} /> Add to basket</button></div>}
      {product.quoteable && <button type="button" onClick={() => void addToQuote()} className={`flex w-full items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold ${directReady ? "border border-[#d2d0c9] text-[#263129] hover:border-[#17221c]" : "bg-[#17221c] text-white hover:bg-[#8b2f24]"}`}>{status === "quote" ? <><Check size={16} /> Added to quote basket</> : "Request quote"}</button>}
      {status === "cart" && <a href="/cart" className="block text-center text-sm font-bold text-[#8b2f24]">View purchase basket</a>}
      {status === "quote" && <a href="/quote" className="block text-center text-sm font-bold text-[#8b2f24]">View quote basket</a>}
    </div>
  </section>;
}
