"use client";

import Link from "next/link";
import { ArrowRight, Check, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type Item = { id: string; quantity: number; calculatedAmount: string | null; product: { name: string; slug: string }; pricingSnapshot: { applicableRule?: string | null } };

export function QuoteFlow() {
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ contactName: "", email: "", phone: "", companyName: "", notes: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [quoteNumber, setQuoteNumber] = useState("");

  const load = useCallback(async () => {
    try {
      const [cartResponse, accountResponse] = await Promise.all([fetch("/api/cart?kind=QUOTE", { cache: "no-store" }), fetch("/api/account/summary", { cache: "no-store" })]);
      const cartPayload = await cartResponse.json();
      if (cartResponse.status === 401) throw new Error("Sign in to view your quote basket.");
      if (!cartResponse.ok || !cartPayload.success) throw new Error(cartPayload.error?.message ?? "Could not load your quote basket");
      setItems(cartPayload.data.items);
      if (accountResponse.ok) {
        const account = await accountResponse.json();
        if (account.success) setForm((current) => ({ ...current, contactName: account.data.customer?.contactName ?? account.data.user.name ?? "", email: account.data.user.email ?? "", phone: account.data.customer?.phone ?? account.data.user.phoneNumber ?? "", companyName: account.data.customer?.companyName ?? "" }));
      }
      setError("");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load your quote basket"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function update(item: Item, quantity: number) {
    setBusyId(item.id);
    const response = await fetch(`/api/cart/items/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: Math.max(1, quantity) }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) setError(payload?.error?.message ?? "Could not update this quote item"); else await load();
    setBusyId("");
  }
  async function remove(id: string) { setBusyId(id); const response = await fetch(`/api/cart/items/${id}`, { method: "DELETE" }); if (response.ok) await load(); else setError("Could not remove this item"); setBusyId(""); }
  async function clear() { setBusyId("all"); const response = await fetch("/api/cart?kind=QUOTE", { method: "DELETE" }); if (response.ok) await load(); else setError("Could not clear your quote basket"); setBusyId(""); }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusyId("submit");
    const response = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) setError(payload?.error?.message ?? "We could not submit your request."); else { setQuoteNumber(payload.data.quoteNumber); setItems([]); }
    setBusyId("");
  }

  if (quoteNumber) return <div className="mx-auto max-w-xl py-20 text-center"><Check className="mx-auto text-[var(--mc-accent)]" size={42} /><p className="mt-5 text-base font-bold">Quote request {quoteNumber} received.</p><p className="mt-2 text-sm text-[var(--mc-muted)]">The submitted configuration and server pricing snapshot are saved for review.</p><Link href="/account" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-3 text-sm font-bold text-white">View your account <ArrowRight size={16} /></Link></div>;

  return <div className="grid gap-8 py-8 xl:grid-cols-[minmax(0,1fr)_390px]"><section><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Quote basket</p><h1 className="mt-2 text-3xl font-bold">Request a quotation</h1></div>{items.length ? <button type="button" onClick={() => void clear()} disabled={Boolean(busyId)} className="text-sm font-bold text-[var(--mc-muted)]">Clear basket</button> : null}</div><div className="mt-6 space-y-3">{loading ? <p className="text-sm text-[var(--mc-muted)]">Loading quote basket...</p> : items.length ? items.map((item) => <article key={item.id} className="rounded-lg border border-[var(--mc-line)] bg-white p-4"><div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{item.product.name}</p><p className="mt-1 text-sm text-[var(--mc-muted)]">{item.pricingSnapshot.applicableRule ?? "Custom configuration"}</p></div>{item.calculatedAmount ? <p className="font-bold">Indicative Rs {Number(item.calculatedAmount).toLocaleString("en-IN")}</p> : <p className="text-sm font-semibold text-[var(--mc-muted)]">Custom quote</p>}</div><div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void update(item, item.quantity - 1)} disabled={busyId === item.id || item.quantity <= 1} className="grid size-9 place-items-center rounded-full border border-[var(--mc-line)]"><Minus size={14} /></button><span className="min-w-12 text-center text-sm font-bold">{item.quantity.toLocaleString("en-IN")}</span><button type="button" onClick={() => void update(item, item.quantity + 1)} disabled={busyId === item.id} className="grid size-9 place-items-center rounded-full border border-[var(--mc-line)]"><Plus size={14} /></button><Link href={`/catalog/${item.product.slug}?editItem=${item.id}&kind=QUOTE`} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--mc-line)] px-3 py-2 text-sm font-bold text-[var(--mc-accent)]"><Pencil size={14} />Edit options</Link><button type="button" onClick={() => void remove(item.id)} className="grid size-9 place-items-center rounded-full text-[#a53025]"><Trash2 size={17} /></button></div></article>) : <div className="rounded-lg border border-dashed border-[var(--mc-line)] bg-white p-6"><p className="font-bold">No quote items selected yet.</p><Link href="/products" className="mt-3 inline-flex gap-2 text-sm font-bold text-[var(--mc-accent)]">Browse products <ArrowRight size={15} /></Link></div>}</div></section>
    <form onSubmit={submit} className="h-fit rounded-lg border border-[var(--mc-line)] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">Contact details</p><div className="mt-4 space-y-3">{[["contactName", "Your name", "text"], ["email", "Account email", "email"], ["phone", "Phone number", "tel"], ["companyName", "Company name", "text"]].map(([key, label, type]) => <label key={key} className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input required={key === "contactName" || key === "email"} readOnly={key === "email"} type={type} value={form[key as keyof typeof form]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="w-full rounded-lg border border-[var(--mc-line)] bg-white px-3 py-3 text-[15px] outline-none focus:border-[var(--mc-accent)] read-only:bg-[var(--mc-soft)]" /></label>)}<label className="block"><span className="mb-2 block text-sm font-semibold">Requirements and deadline</span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full rounded-lg border border-[var(--mc-line)] px-3 py-3 text-[15px] outline-none focus:border-[var(--mc-accent)]" rows={4} /></label></div>{error ? <p role="alert" className="mt-4 rounded-lg bg-[#fff4f4] p-3 text-sm text-[#9b2525]">{error}</p> : null}<button disabled={!items.length || Boolean(busyId)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mc-accent)] px-4 py-3.5 text-sm font-bold text-white disabled:opacity-50">Submit quote request <ArrowRight size={16} /></button></form>
  </div>;
}
