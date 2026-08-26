"use client";

import { ArrowLeft, ArrowRight, Check, FileUp, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { StorefrontHeader } from "@/components/storefront-header";
import { QuoteFlow } from "@/components/quote-flow";

type BasketItem = { productId: string; slug: string; name: string; configuration: Record<string, string> };

export default function QuotePage() {
  return <main className="min-h-screen bg-[#f8f7f3] text-[#18231e]"><StorefrontHeader /><div className="mx-auto max-w-[1100px] px-5 py-10 xl:py-14"><QuoteFlow /></div></main>;
  const [basket, setBasket] = useState<BasketItem[]>([]);
  const [submitted, setSubmitted] = useState<{ quoteNumber: string } | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ contactName: "", email: "", phone: "", companyName: "", notes: "" });

  useEffect(() => {
    // Load the client-only basket after hydration to avoid a server/client mismatch.
    setBasket(JSON.parse(window.localStorage.getItem("mahavir-quote-basket") ?? "[]"));
  }, []);
  const totalItems = useMemo(() => basket.reduce((sum, item) => sum + Number(item.configuration.quantity || 1), 0), [basket]);

  function updateQuantity(index: number, amount: number) {
    setBasket((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, configuration: { ...item.configuration, quantity: String(Math.max(1, Number(item.configuration.quantity || 1) + amount)) } } : item));
  }

  function removeItem(index: number) {
    setBasket((current) => { const next = current.filter((_, itemIndex) => itemIndex !== index); window.localStorage.setItem("mahavir-quote-basket", JSON.stringify(next)); return next; });
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const items = basket.length > 0 ? basket.map((item) => ({ productId: item.productId, description: item.name, configuration: item.configuration, quantity: Number(item.configuration.quantity || 1), unitPrice: "0" })) : [{ description: "Custom printing requirement", configuration: {}, quantity: 1, unitPrice: "0" }];
    const response = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, items }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error?.message ?? "We could not submit your request."); return; }
    setSubmitted(result.data); window.localStorage.removeItem("mahavir-quote-basket"); setBasket([]);
  }

  if (submitted) return <main className="min-h-screen bg-[#f8f7f3] text-[#18231e]"><StorefrontHeader /><div className="mx-auto max-w-2xl px-5 py-24 text-center"><div className="mx-auto grid size-16 place-items-center bg-[#b7d5bd] text-[#18231e]"><Check size={28} /></div><p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-[#f15a3a]">Quote request received</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.06em]">We have your brief.</h1><p className="mt-4 text-sm leading-7 text-[#646b64]">Your reference is <strong>{submitted!.quoteNumber}</strong>. Our team will review the specifications and contact you with the final quote.</p><a href="/account" className="mt-8 inline-flex items-center gap-2 bg-[#17221c] px-5 py-3.5 text-sm font-bold text-white">View your quotes <ArrowRight size={17} /></a></div></main>;

  return <main className="min-h-screen bg-[#f8f7f3] text-[#18231e]"><StorefrontHeader /><div className="mx-auto max-w-[1100px] px-5 py-10 xl:py-14"><a href="/catalog" className="inline-flex items-center gap-2 text-sm font-semibold text-[#646b64] hover:text-[#f15a3a]"><ArrowLeft size={16} /> Continue browsing</a><div className="mt-8 grid gap-10 xl:grid-cols-[1fr_380px]"><section><p className="text-xs font-bold uppercase tracking-[0.16em] text-[#f15a3a]">Your brief</p><h1 className="mt-3 text-4xl font-bold tracking-[-0.06em]">Request a quote</h1><p className="mt-3 text-sm leading-6 text-[#646b64]">Tell us where to reach you. We will check the details and come back with the final number.</p><div className="mt-8 space-y-3">{basket.length > 0 ? basket.map((item, index) => <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-4 border border-[#ddd9d0] bg-white p-4"><div><p className="font-bold">{item.name}</p><p className="mt-1 text-xs text-[#777d76]">{Object.entries(item.configuration).filter(([key]) => key !== "quantity").map(([key, value]) => `${key}: ${value}`).join(" · ")}</p></div><div className="flex items-center gap-2"><button type="button" onClick={() => updateQuantity(index, -1)} className="grid size-7 place-items-center border border-[#d9d6ce]" aria-label="Decrease quantity"><Minus size={14} /></button><span className="min-w-8 text-center text-sm font-bold">{item.configuration.quantity}</span><button type="button" onClick={() => updateQuantity(index, 1)} className="grid size-7 place-items-center border border-[#d9d6ce]" aria-label="Increase quantity"><Plus size={14} /></button><button type="button" onClick={() => removeItem(index)} className="ml-2 grid size-7 place-items-center text-[#f15a3a]" aria-label={`Remove ${item.name}`}><Trash2 size={15} /></button></div></div>) : <div className="border border-dashed border-[#cfcfc6] bg-white p-6"><p className="font-bold">No products selected yet.</p><p className="mt-2 text-sm text-[#646b64]">You can still send a custom requirement below, or choose a product first.</p><a href="/catalog" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#f15a3a]">Browse catalogue <ArrowRight size={16} /></a></div>}</div><div className="mt-6 flex items-center gap-3 border border-dashed border-[#ccc9c0] bg-white p-4 text-sm text-[#646b64]"><FileUp size={18} className="text-[#f15a3a]" /><span>Artwork can be added after we review the quote.</span></div></section><form onSubmit={submit} className="h-fit border border-[#d9d6ce] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.14em]">Contact details</p><div className="mt-5 space-y-4">{[["contactName", "Your name", "text"], ["email", "Work email", "email"], ["phone", "Phone number", "tel"], ["companyName", "Company name", "text"]].map(([id, label, type]) => <label key={id} className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#646b64]">{label}</span><input required={id === "contactName" || id === "email"} type={type} value={form[id as keyof typeof form]} onChange={(event) => setForm({ ...form, [id]: event.target.value })} className="w-full border border-[#d9d6ce] bg-[#fbfaf7] px-3 py-3 text-sm outline-none focus:border-[#f15a3a]" /></label>)}<label className="block"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.1em] text-[#646b64]">Notes or requirements</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={5} placeholder="Dimensions, material, finishing, deadline..." className="w-full resize-none border border-[#d9d6ce] bg-[#fbfaf7] px-3 py-3 text-sm outline-none focus:border-[#f15a3a]" /></label></div>{error && <p className="mt-4 bg-[#fde2dc] p-3 text-sm text-[#9d2f1d]">{error}</p>}<button type="submit" className="mt-6 flex w-full items-center justify-center gap-2 bg-[#f15a3a] px-4 py-3.5 text-sm font-bold text-white hover:bg-[#18231e]">Send request <ArrowRight size={17} /></button><p className="mt-3 text-center text-xs text-[#858a83]">{totalItems || "Custom"} {totalItems ? "units in this request" : "print requirement"}</p></form></div></div></main>;
}
