"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, MapPin, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { formatInr } from "@/lib/formatting";
import { commerceStates, indiaStateName } from "@/lib/india-states";

type Item = { id: string; quantity: number; calculatedAmount: string | null; available: boolean; product: { name: string }; pricingSnapshot: { applicableRule?: string | null; delivery?: { method?: string | null; price?: string } } };
type CartData = { items: Item[]; summary: { productSubtotal: string; addonSubtotal: string; deliverySubtotal: string; surchargeSubtotal: string; priceBeforeTax: string; tax: string; cgst: string; sgst: string; igst: string; total: string; taxInclusive: boolean; hasTaxBreakdown: boolean; hasUnavailableItems: boolean } };
type AccountCustomer = { customerType: string; creditEnabled: boolean; availableCredit: string; paymentTermsDays: number; status: string };
type Result = { order: { id: string; orderNumber: string }; payment: { method: string; status: string }; availableCredit: string | null; razorpay: { orderId: string; keyId: string; amount: number; currency: string } | null };
type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; }
}

export function CheckoutFlow() {
  const [cart, setCart] = useState<CartData>({ items: [], summary: { productSubtotal: "0.00", addonSubtotal: "0.00", deliverySubtotal: "0.00", surchargeSubtotal: "0.00", priceBeforeTax: "0.00", tax: "0.00", cgst: "0.00", sgst: "0.00", igst: "0.00", total: "0.00", taxInclusive: false, hasTaxBreakdown: false, hasUnavailableItems: false } });
  const [method, setMethod] = useState<"RAZORPAY" | "COD" | "CREDIT">("COD");
  const [customer, setCustomer] = useState({ contactName: "", companyName: "", phone: "" });
  const [accountCustomer, setAccountCustomer] = useState<AccountCustomer | null>(null);
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "Gujarat", stateCode: "GJ", postalCode: "", country: "India" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/cart?kind=PURCHASE", { cache: "no-store" }),
      fetch("/api/account/summary", { cache: "no-store" }),
      fetch("/api/payments/config", { cache: "no-store" }),
    ]).then(async ([cartResponse, accountResponse, paymentConfigResponse]) => {
      const cartPayload = await cartResponse.json();
      if (cartResponse.status === 401) throw new Error("Please sign in before checkout.");
      if (!cartResponse.ok || !cartPayload.success) throw new Error(cartPayload.error?.message ?? "Could not load your basket");
      if (!active) return;
      setCart(cartPayload.data);
      if (paymentConfigResponse.ok) {
        const paymentConfigPayload = await paymentConfigResponse.json();
        setRazorpayEnabled(Boolean(paymentConfigPayload.success && paymentConfigPayload.data.razorpayEnabled));
      }
      if (accountResponse.ok) {
        const accountPayload = await accountResponse.json();
        if (accountPayload.success) {
          const profile = accountPayload.data;
          setCustomer({ contactName: profile.customer?.contactName ?? profile.user.name ?? "", companyName: profile.customer?.companyName ?? "", phone: profile.customer?.phone ?? profile.user.phoneNumber ?? "" });
          setAccountCustomer(profile.customer ?? null);
          const saved = profile.addresses?.[0];
          if (saved) {
            const stateCode = saved.stateCode ?? commerceStates.find(([, name]) => name === saved.state)?.[0] ?? "GJ";
            setAddress({ line1: saved.line1 ?? "", line2: saved.line2 ?? "", city: saved.city ?? "", state: indiaStateName(stateCode) ?? "Gujarat", stateCode, postalCode: saved.postalCode ?? "", country: saved.country ?? "India" });
          }
          if (profile.customer?.customerType === "B2B" && profile.customer.creditEnabled && profile.customer.status === "ACTIVE" && Number(profile.customer.availableCredit) >= Number(cartPayload.data.summary.total)) setMethod("CREDIT");
        }
      }
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load checkout"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, address, paymentMethod: method }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "We could not create this order.");
      const created = payload.data as Result;
      if (method !== "RAZORPAY" || !created.razorpay) { setResult(created); return; }
      const callback = await openRazorpay(created);
      const verification = await fetch("/api/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ razorpayOrderId: callback.razorpay_order_id, razorpayPaymentId: callback.razorpay_payment_id, razorpaySignature: callback.razorpay_signature }) });
      const verified = await verification.json().catch(() => null);
      if (!verification.ok || !verified?.success) throw new Error(verified?.error?.message ?? "Payment could not be verified. Check your order status before retrying.");
      setResult({ ...created, payment: verified.data.payment, razorpay: null });
    } catch (caught) { setError(caught instanceof Error ? caught.message : "We could not complete checkout."); }
    finally { setSubmitting(false); }
  }

  async function openRazorpay(created: Result) {
    await loadRazorpayScript();
    if (!window.Razorpay || !created.razorpay) throw new Error("Secure payment checkout could not be loaded.");
    return new Promise<RazorpayResponse>((resolve, reject) => {
      const checkout = new window.Razorpay!({
        key: created.razorpay!.keyId,
        amount: created.razorpay!.amount,
        currency: created.razorpay!.currency,
        name: "Mahavir Card",
        description: `Order ${created.order.orderNumber}`,
        order_id: created.razorpay!.orderId,
        prefill: { name: customer.contactName, contact: customer.phone },
        handler: (response: RazorpayResponse) => resolve(response),
        modal: { ondismiss: () => reject(new Error("Payment was cancelled. The pending order remains in Order Status.")) },
        theme: { color: "#2457b8" },
      });
      checkout.open();
    });
  }

  if (loading) return <CheckoutSkeleton />;

  if (result) return <div className="mx-auto max-w-xl py-20 text-center"><CheckCircle2 className="mx-auto text-[var(--mc-accent)]" size={48} /><h2 className="mt-6 text-2xl font-bold text-[var(--mc-ink)]">Order {result.order.orderNumber} created!</h2><p className="mt-3 text-sm leading-6 text-[var(--mc-muted)]">{result.payment.method === "CREDIT" ? `The order is confirmed against your credit account. Available credit: ${formatInr(result.availableCredit)}.` : result.payment.method === "COD" ? "Cash on delivery is recorded and pending collection." : "Online payment verified. Your order is confirmed."}</p><Link href={`/account/orders/${result.order.id}`} className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors">View order details <ArrowRight size={16} /></Link></div>;

  const fieldClass = "w-full rounded-lg border border-[var(--mc-line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--mc-accent)] transition-colors";
  return <form onSubmit={submit} className="py-6 sm:py-8"><div className="border-b border-[var(--mc-line)] pb-5"><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Checkout</p><h1 className="mt-2 text-3xl font-bold text-[var(--mc-ink)]">Confirm your order</h1><p className="mt-2 text-sm text-[var(--mc-muted)]">The server recalculates every product, add-on, and delivery charge before creating the order.</p></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]"><div className="space-y-5"><section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><div className="flex items-center gap-2"><Truck size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold text-lg text-[var(--mc-ink)]">Customer details</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2">{[["contactName", "Contact name", "text"], ["companyName", "Company name", "text"], ["phone", "Mobile number", "tel"]].map(([key, label, type]) => <label key={key} className="block"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">{label}</span><input required type={type} value={customer[key as keyof typeof customer]} onChange={(event) => setCustomer({ ...customer, [key]: event.target.value })} className={fieldClass} /></label>)}</div></section>
      <section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><div className="flex items-center gap-2"><MapPin size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold text-lg text-[var(--mc-ink)]">Delivery address</h2></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Address line 1</span><input required value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} className={fieldClass} /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Address line 2 <span className="font-normal text-[var(--mc-muted)]">(optional)</span></span><input value={address.line2} onChange={(event) => setAddress({ ...address, line2: event.target.value })} className={fieldClass} /></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">City</span><input required value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} className={fieldClass} /></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">State</span><select required value={address.stateCode} onChange={(event) => setAddress({ ...address, stateCode: event.target.value, state: indiaStateName(event.target.value) ?? "" })} className={fieldClass}>{commerceStates.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Postal code</span><input required inputMode="numeric" maxLength={6} value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} className={fieldClass} /></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Country</span><input required value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} className={fieldClass} /></label></div></section>
      <section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><div className="flex items-center gap-2"><CreditCard size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold text-lg text-[var(--mc-ink)]">Payment method</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{accountCustomer?.customerType === "B2B" && accountCustomer.creditEnabled ? <button type="button" disabled={accountCustomer.status !== "ACTIVE" || Number(accountCustomer.availableCredit) < Number(cart.summary.total)} onClick={() => setMethod("CREDIT")} className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${method === "CREDIT" ? "border-[var(--mc-accent)] bg-[var(--mc-accent-soft)] ring-1 ring-[var(--mc-accent)]" : "border-[var(--mc-line)] hover:bg-[var(--mc-surface)]"}`}><strong className="block text-[var(--mc-ink)]">Business credit</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Available {formatInr(accountCustomer.availableCredit)} · {accountCustomer.paymentTermsDays} day terms</span></button> : null}<button type="button" onClick={() => setMethod("COD")} className={`rounded-xl border p-4 text-left transition-colors ${method === "COD" ? "border-[var(--mc-accent)] bg-[var(--mc-accent-soft)] ring-1 ring-[var(--mc-accent)]" : "border-[var(--mc-line)] hover:bg-[var(--mc-surface)]"}`}><strong className="block text-[var(--mc-ink)]">Cash on delivery</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Pay when the order is delivered.</span></button>{razorpayEnabled ? <button type="button" onClick={() => setMethod("RAZORPAY")} className={`rounded-xl border p-4 text-left transition-colors ${method === "RAZORPAY" ? "border-[var(--mc-accent)] bg-[var(--mc-accent-soft)] ring-1 ring-[var(--mc-accent)]" : "border-[var(--mc-line)] hover:bg-[var(--mc-surface)]"}`}><strong className="block text-[var(--mc-ink)]">Razorpay</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Pay securely online with Cards, UPI or NetBanking.</span></button> : null}</div></section>{error ? <p role="alert" className="rounded-xl border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm text-[#9b2525]">{error}</p> : null}</div>
      <aside className="h-fit rounded-xl border border-[var(--mc-line)] bg-white p-5 xl:sticky xl:top-[116px] shadow-sm"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">Order summary</p>{cart.items.length ? <div className="mt-4 space-y-3">{cart.items.map((item) => <div key={item.id} className="border-t border-[var(--mc-line)] pt-3"><div className="flex justify-between gap-3"><div><p className="font-bold text-[var(--mc-ink)]">{item.product.name}</p><p className="mt-1 text-xs text-[var(--mc-muted)]">Qty {item.quantity.toLocaleString("en-IN")} · {item.pricingSnapshot.applicableRule ?? "Configured"}</p></div><strong className="text-[var(--mc-ink)]">{formatInr(item.calculatedAmount)}</strong></div></div>)}{cart.summary.hasTaxBreakdown ? <div className="space-y-2 border-t border-[var(--mc-line)] pt-3 text-sm text-[var(--mc-muted)]"><p className="flex justify-between"><span>Base products</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.productSubtotal)}</strong></p>{Number(cart.summary.addonSubtotal) > 0 ? <p className="flex justify-between"><span>Add-ons</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.addonSubtotal)}</strong></p> : null}{Number(cart.summary.deliverySubtotal) > 0 ? <p className="flex justify-between"><span>Courier</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.deliverySubtotal)}</strong></p> : null}{Number(cart.summary.surchargeSubtotal) > 0 ? <p className="flex justify-between"><span>Other charges</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.surchargeSubtotal)}</strong></p> : null}<p className="flex justify-between border-t border-[var(--mc-line)] pt-2"><span>Taxable subtotal</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.priceBeforeTax)}</strong></p>{Number(cart.summary.cgst) > 0 ? <p className="flex justify-between"><span>CGST 9%</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.cgst)}</strong></p> : null}{Number(cart.summary.sgst) > 0 ? <p className="flex justify-between"><span>SGST 9%</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.sgst)}</strong></p> : null}{Number(cart.summary.igst) > 0 ? <p className="flex justify-between"><span>IGST 18%</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.igst)}</strong></p> : null}</div> : null}<div className="flex justify-between border-t border-[var(--mc-line)] pt-4 text-lg font-bold"><span>Grand total</span><span className="text-[var(--mc-accent-dark)]">{formatInr(cart.summary.total)}</span></div></div> : <p className="mt-4 text-sm text-[var(--mc-muted)]">Your basket is empty. <Link href="/products" className="font-bold text-[var(--mc-accent)]">Browse products</Link></p>}<button disabled={!cart.items.length || cart.summary.hasUnavailableItems || loading || submitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-4 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating order..." : method === "CREDIT" ? "Place credit order" : method === "COD" ? "Place COD order" : "Pay with Razorpay"}<ArrowRight size={16} /></button></aside>
    </div></form>;
}

function CheckoutSkeleton() {
  return (
    <div className="py-8 animate-pulse">
      <div className="h-8 w-48 rounded bg-[#dce4f0]" />
      <div className="mt-2 h-4 w-96 rounded bg-[#e8edf5]" />
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-48" />
          <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-64" />
        </div>
        <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-80" />
      </div>
    </div>
  );
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener("load", () => resolve(), { once: true }); existing.addEventListener("error", () => reject(new Error("Secure payment checkout could not be loaded.")), { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Secure payment checkout could not be loaded."));
    document.head.appendChild(script);
  });
}
