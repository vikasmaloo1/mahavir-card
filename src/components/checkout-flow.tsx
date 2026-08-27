"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, MapPin, Truck } from "lucide-react";
import { useEffect, useState } from "react";

type Item = { id: string; quantity: number; calculatedAmount: string | null; available: boolean; product: { name: string }; pricingSnapshot: { applicableRule?: string | null; delivery?: { method?: string | null; price?: string } } };
type CartData = { items: Item[]; summary: { total: string; taxInclusive: boolean; hasUnavailableItems: boolean } };
type Result = { order: { orderNumber: string }; payment: { method: string; status: string } };

export function CheckoutFlow() {
  const [cart, setCart] = useState<CartData>({ items: [], summary: { total: "0.00", taxInclusive: true, hasUnavailableItems: false } });
  const [method, setMethod] = useState<"RAZORPAY" | "COD">("COD");
  const [customer, setCustomer] = useState({ contactName: "", companyName: "", phone: "" });
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "Gujarat", postalCode: "", country: "India" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/cart?kind=PURCHASE", { cache: "no-store" }), fetch("/api/account/summary", { cache: "no-store" })]).then(async ([cartResponse, accountResponse]) => {
      const cartPayload = await cartResponse.json();
      if (cartResponse.status === 401) throw new Error("Please sign in before checkout.");
      if (!cartResponse.ok || !cartPayload.success) throw new Error(cartPayload.error?.message ?? "Could not load your basket");
      if (!active) return;
      setCart(cartPayload.data);
      if (accountResponse.ok) {
        const accountPayload = await accountResponse.json();
        if (accountPayload.success) {
          const profile = accountPayload.data;
          setCustomer({ contactName: profile.customer?.contactName ?? profile.user.name ?? "", companyName: profile.customer?.companyName ?? "", phone: profile.customer?.phone ?? profile.user.phoneNumber ?? "" });
          const saved = profile.addresses?.[0];
          if (saved) setAddress({ line1: saved.line1 ?? "", line2: saved.line2 ?? "", city: saved.city ?? "", state: saved.state ?? "", postalCode: saved.postalCode ?? "", country: saved.country ?? "India" });
        }
      }
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load checkout"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, address, paymentMethod: method }) });
    const payload = await response.json().catch(() => null);
    if (!response.ok) setError(payload?.error?.message ?? "We could not create this order."); else setResult(payload.data);
    setSubmitting(false);
  }

  if (result) return <div className="mx-auto max-w-xl py-20 text-center"><CheckCircle2 className="mx-auto text-[var(--mc-accent)]" size={44} /><p className="mt-6 text-lg font-bold">Order {result.order.orderNumber} created.</p><p className="mt-3 text-sm leading-6 text-[var(--mc-muted)]">{result.payment.method === "COD" ? "Cash on delivery is recorded and pending collection." : "Your Razorpay payment request is pending provider confirmation."}</p><Link href="/account" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-3 text-sm font-bold text-white">View account <ArrowRight size={16} /></Link></div>;

  const fieldClass = "w-full rounded-lg border border-[var(--mc-line)] bg-white px-3 py-3 text-[15px] outline-none focus:border-[var(--mc-accent)]";
  return <form onSubmit={submit} className="py-8"><div className="border-b border-[var(--mc-line)] pb-5"><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Checkout</p><h1 className="mt-2 text-3xl font-bold">Confirm your order</h1><p className="mt-2 text-sm text-[var(--mc-muted)]">The server recalculates every product, add-on, and delivery charge before creating the order.</p></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]"><div className="space-y-5"><section className="rounded-lg border border-[var(--mc-line)] bg-white p-5"><div className="flex items-center gap-2"><Truck size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold">Customer details</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{[["contactName", "Contact name", "text"], ["companyName", "Company name", "text"], ["phone", "Mobile number", "tel"]].map(([key, label, type]) => <label key={key} className="block"><span className="mb-2 block text-sm font-semibold">{label}</span><input required type={type} value={customer[key as keyof typeof customer]} onChange={(event) => setCustomer({ ...customer, [key]: event.target.value })} className={fieldClass} /></label>)}</div></section>
      <section className="rounded-lg border border-[var(--mc-line)] bg-white p-5"><div className="flex items-center gap-2"><MapPin size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold">Delivery address</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Address line 1</span><input required value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} className={fieldClass} /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold">Address line 2 <span className="font-normal text-[var(--mc-muted)]">(optional)</span></span><input value={address.line2} onChange={(event) => setAddress({ ...address, line2: event.target.value })} className={fieldClass} /></label>{[["city", "City"], ["state", "State"], ["postalCode", "Postal code"], ["country", "Country"]].map(([key, label]) => <label key={key}><span className="mb-2 block text-sm font-semibold">{label}</span><input required inputMode={key === "postalCode" ? "numeric" : undefined} maxLength={key === "postalCode" ? 6 : undefined} value={address[key as keyof typeof address]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} className={fieldClass} /></label>)}</div></section>
      <section className="rounded-lg border border-[var(--mc-line)] bg-white p-5"><div className="flex items-center gap-2"><CreditCard size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold">Payment method</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setMethod("COD")} className={`rounded-lg border p-4 text-left ${method === "COD" ? "border-[var(--mc-accent)] bg-[var(--mc-accent-soft)]" : "border-[var(--mc-line)]"}`}><strong className="block">Cash on delivery</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Pay when the order is delivered.</span></button><button type="button" onClick={() => setMethod("RAZORPAY")} className={`rounded-lg border p-4 text-left ${method === "RAZORPAY" ? "border-[var(--mc-accent)] bg-[var(--mc-accent-soft)]" : "border-[var(--mc-line)]"}`}><strong className="block">Razorpay</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Create a secure payment request.</span></button></div></section>{error ? <p role="alert" className="rounded-lg border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm text-[#9b2525]">{error}</p> : null}</div>
      <aside className="h-fit rounded-lg border border-[var(--mc-line)] bg-white p-5 xl:sticky xl:top-[116px]"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">Order summary</p>{loading ? <p className="mt-4 text-sm text-[var(--mc-muted)]">Loading basket...</p> : cart.items.length ? <div className="mt-4 space-y-3">{cart.items.map((item) => <div key={item.id} className="border-t border-[var(--mc-line)] pt-3"><div className="flex justify-between gap-3"><div><p className="font-bold">{item.product.name}</p><p className="mt-1 text-xs text-[var(--mc-muted)]">Qty {item.quantity.toLocaleString("en-IN")} · {item.pricingSnapshot.applicableRule ?? "Configured"}</p></div><strong>Rs {Number(item.calculatedAmount ?? 0).toLocaleString("en-IN")}</strong></div></div>)}<div className="flex justify-between border-t border-[var(--mc-line)] pt-4 text-lg font-bold"><span>Total</span><span>Rs {Number(cart.summary.total).toLocaleString("en-IN")}</span></div>{cart.summary.taxInclusive ? <p className="text-xs text-[var(--mc-muted)]">Includes applicable GST/taxes.</p> : null}</div> : <p className="mt-4 text-sm text-[var(--mc-muted)]">Your basket is empty. <Link href="/products" className="font-bold text-[var(--mc-accent)]">Browse products</Link></p>}<button disabled={!cart.items.length || cart.summary.hasUnavailableItems || loading || submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating order..." : method === "COD" ? "Place COD order" : "Create Razorpay request"}<ArrowRight size={16} /></button></aside>
    </div></form>;
}
