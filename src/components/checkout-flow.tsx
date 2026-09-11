"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, MapPin, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { formatInr, formatRoundOff } from "@/lib/formatting";
import { citiesForState, commerceStates, indiaStateName } from "@/lib/india-states";
import { cachedFetchJson } from "@/lib/client-fetch-cache";
import { UpiQrCode } from "@/components/upi-qr-code";
import { PaymentBankDetails } from "@/components/payment-bank-details";

type Item = { id: string; quantity: number; calculatedAmount: string | null; available: boolean; product: { name: string }; pricingSnapshot: { applicableRule?: string | null; addons?: Array<{ name: string; price: string }>; delivery?: { method?: string | null; price?: string } } };
type CartData = { items: Item[]; summary: { productSubtotal: string; addonSubtotal: string; deliverySubtotal: string; surchargeSubtotal: string; priceBeforeTax: string; tax: string; cgst: string; sgst: string; igst: string; roundOff?: string; total: string; taxInclusive: boolean; hasTaxBreakdown: boolean; hasUnavailableItems: boolean } };
type AccountCustomer = { customerType: string; creditEnabled: boolean; availableCredit: string; paymentTermsDays: number; status: string };
type AccountSummary = { user: { name: string; email: string; phoneNumber?: string | null }; customer: (AccountCustomer & { contactName?: string; companyName?: string; phone?: string }) | null; addresses?: Array<{ line1?: string; line2?: string; city?: string; state?: string; stateCode?: string; postalCode?: string; country?: string; isDefault?: boolean }> };
type Result = { order: { id: string; orderNumber: string }; payment: { method: string; status: string; amount: string }; availableCredit: string | null; razorpay: { orderId: string; keyId: string; amount: number; currency: string } | null };
type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; }
}

export function CheckoutFlow({ upiVpa }: { upiVpa: string }) {
  const [cart, setCart] = useState<CartData>({ items: [], summary: { productSubtotal: "0.00", addonSubtotal: "0.00", deliverySubtotal: "0.00", surchargeSubtotal: "0.00", priceBeforeTax: "0.00", tax: "0.00", cgst: "0.00", sgst: "0.00", igst: "0.00", total: "0.00", taxInclusive: false, hasTaxBreakdown: false, hasUnavailableItems: false } });
  const [method, setMethod] = useState<"RAZORPAY" | "COD" | "CREDIT" | "UPI_QR">("COD");
  const [utr, setUtr] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [customer, setCustomer] = useState({ contactName: "", companyName: "", phone: "" });
  const [accountCustomer, setAccountCustomer] = useState<AccountCustomer | null>(null);
  const [address, setAddress] = useState({ line1: "", line2: "", city: "", state: "Gujarat", stateCode: "GJ", postalCode: "", country: "India" });
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [razorpayEnabled, setRazorpayEnabled] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/cart?kind=PURCHASE", { cache: "no-store" }).then(async (response) => ({ status: response.status, ok: response.ok, payload: await response.json().catch(() => null) })),
      cachedFetchJson<{ success: boolean; data: AccountSummary }>("/api/account/summary"),
      cachedFetchJson<{ success: boolean; data: { razorpayEnabled?: boolean } }>("/api/payments/config"),
    ]).then(async ([cartResult, accountResult, paymentConfigResult]) => {
      const cartPayload = cartResult.payload;
      if (cartResult.status === 401) { setAuthRequired(true); throw new Error("Your session has expired. Sign in to continue checkout."); }
      if (!cartResult.ok || !cartPayload?.success) throw new Error(cartPayload?.error?.message ?? "Could not load your basket");
      if (!active) return;
      setCart(cartPayload.data);
      if (paymentConfigResult.ok && paymentConfigResult.payload) {
        setRazorpayEnabled(Boolean(paymentConfigResult.payload.success && paymentConfigResult.payload.data.razorpayEnabled));
      }
      if (accountResult.ok && accountResult.payload) {
        const accountPayload = accountResult.payload;
        if (accountPayload.success) {
          const profile = accountPayload.data;
          setCustomer({ contactName: profile.customer?.contactName ?? profile.user.name ?? "", companyName: profile.customer?.companyName ?? "", phone: profile.customer?.phone ?? profile.user.phoneNumber ?? "" });
          setAccountCustomer(profile.customer ?? null);
          const saved = profile.addresses?.find((entry) => entry.isDefault) ?? profile.addresses?.[0];
          if (saved) {
            const stateCode = saved.stateCode ?? commerceStates.find(([, name]) => name === saved.state)?.[0] ?? "GJ";
            setAddress({ line1: saved.line1 ?? "", line2: saved.line2 ?? "", city: saved.city ?? "", state: indiaStateName(stateCode) ?? "Gujarat", stateCode, postalCode: saved.postalCode ?? "", country: saved.country ?? "India" });
            setHasSavedAddress(true);
          }
          if (profile.customer?.customerType === "B2B" && profile.customer.creditEnabled && profile.customer.status === "ACTIVE") {
            setMethod("CREDIT");
          } else if (profile.customer?.customerType === "B2C" && profile.customer.status === "ACTIVE" && Number(profile.customer.availableCredit || 0) >= Number(cartPayload.data.summary.total)) {
            setMethod("CREDIT");
          }
        }
      }
    }).catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Could not load checkout"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (loading || !address.stateCode) return;
    let active = true;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ kind: "PURCHASE", stateCode: address.stateCode });
      if (address.city.trim()) params.set("city", address.city.trim());
      fetch(`/api/cart?${params.toString()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((payload) => {
          if (active && payload?.success) {
            setCart(payload.data);
          }
        })
        .catch(() => {});
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [address.stateCode, address.city, loading]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if (method === "UPI_QR" && !proofImageUrl) {
      setError("Please upload your payment screenshot before placing the order.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          address,
          paymentMethod: method,
          proofImageUrl: method === "UPI_QR" ? proofImageUrl : undefined,
          utr: method === "UPI_QR" ? utr.trim() || undefined : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "We could not create this order.");
      const created = payload.data as Result;
      if (method !== "RAZORPAY" || !created.razorpay) { setResult(created); return; }
      const callback = await openRazorpay(created);
      const verification = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          razorpayOrderId: callback.razorpay_order_id,
          razorpayPaymentId: callback.razorpay_payment_id,
          razorpaySignature: callback.razorpay_signature,
        }),
      });
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

  if (result) {
    return (
      <div className="mx-auto max-w-xl py-20 text-center">
        <CheckCircle2 className="mx-auto text-[var(--mc-accent)]" size={48} />
        <h2 className="mt-6 text-2xl font-bold text-[var(--mc-ink)]">
          Order {result.order.orderNumber} created!
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--mc-muted)]">
          {result.payment.method === "CREDIT"
            ? `The order is confirmed against your wallet balance. Remaining balance: ${formatInr(result.availableCredit)}.`
            : result.payment.method === "COD"
            ? "Cash on delivery is recorded and pending collection."
            : result.payment.method === "UPI_QR"
            ? "Payment screenshot submitted. Verification pending — our team will verify the payment and begin processing your order."
            : "Online payment verified. Your order is confirmed."}
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/account/orders/${result.order.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors"
          >
            View order details <ArrowRight size={16} />
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--mc-line)] bg-white px-6 py-3 text-sm font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] transition-colors"
          >
            Place another order
          </Link>
        </div>
      </div>
    );
  }

  const fieldClass = "w-full rounded-lg border border-[var(--mc-line)] bg-white px-3.5 py-3 text-[15px] outline-none focus:border-[var(--mc-accent)] transition-colors";
  return <form onSubmit={submit} className="py-6 sm:py-8"><div className="border-b border-[var(--mc-line)] pb-5"><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Checkout</p><h1 className="mt-2 text-3xl font-bold text-[var(--mc-ink)]">Confirm your order</h1><p className="mt-2 text-sm text-[var(--mc-muted)]">The server recalculates every product, add-on, and delivery charge before creating the order.</p></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_370px]"><div className="space-y-5"><section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Truck size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold text-lg text-[var(--mc-ink)]">Customer details</h2></div>{!editingCustomer && customer.contactName && customer.phone ? <button type="button" onClick={() => setEditingCustomer(true)} className="text-xs font-bold text-[var(--mc-accent)] hover:underline">Edit</button> : null}</div>
        {!editingCustomer && customer.contactName && customer.phone ? (
          <div className="mt-3 text-sm text-[var(--mc-muted)]"><p className="font-bold text-[var(--mc-ink)]">{customer.contactName}</p>{customer.companyName ? <p>{customer.companyName}</p> : null}<p>{customer.phone}</p></div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">{[["contactName", "Contact name", "text", "name"], ["companyName", "Company name", "text", "organization"], ["phone", "Mobile number", "tel", "tel"]].map(([key, label, type, auto]) => <label key={key} className="block"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">{label}</span><input required type={type} name={key} autoComplete={auto} value={customer[key as keyof typeof customer]} onChange={(event) => setCustomer({ ...customer, [key]: event.target.value })} className={fieldClass} /></label>)}</div>
        )}
      </section>
      <section className="rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><MapPin size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold text-lg text-[var(--mc-ink)]">Delivery address</h2></div>{hasSavedAddress ? <button type="button" onClick={() => setEditingAddress((value) => !value)} className="text-xs font-bold text-[var(--mc-accent)] hover:underline">{editingAddress ? "Use saved address" : "Deliver to a different address"}</button> : null}</div>
        {hasSavedAddress && !editingAddress ? (
          <div className="mt-3 text-sm text-[var(--mc-muted)]"><p className="font-bold text-[var(--mc-ink)]">{address.line1}</p>{address.line2 ? <p>{address.line2}</p> : null}<p>{address.city}, {address.state} {address.postalCode}</p><p>{address.country}</p></div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">{address.line1}</span><input required name="address-line1" autoComplete="address-line1" value={address.line1} onChange={(event) => setAddress({ ...address, line1: event.target.value })} className={fieldClass} /></label><label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Address line 2 <span className="font-normal text-[var(--mc-muted)]">(optional)</span></span><input name="address-line2" autoComplete="address-line2" value={address.line2} onChange={(event) => setAddress({ ...address, line2: event.target.value })} className={fieldClass} /></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">City</span><input required list="checkout-city-options" name="address-level2" autoComplete="address-level2" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} className={fieldClass} /><datalist id="checkout-city-options">{citiesForState(address.stateCode).map((city) => <option key={city} value={city} />)}</datalist></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">State</span><select required name="address-level1" autoComplete="address-level1" value={address.stateCode} onChange={(event) => setAddress({ ...address, stateCode: event.target.value, state: indiaStateName(event.target.value) ?? "" })} className={fieldClass}>{commerceStates.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Postal code</span><input required inputMode="numeric" maxLength={6} name="postal-code" autoComplete="postal-code" value={address.postalCode} onChange={(event) => setAddress({ ...address, postalCode: event.target.value })} className={fieldClass} /></label><label><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Country</span><input required name="country-name" autoComplete="country-name" value={address.country} onChange={(event) => setAddress({ ...address, country: event.target.value })} className={fieldClass} /></label></div>
        )}
      </section>
      <section className="rounded-xl border border-[#d4e4f5] mc-section-blue p-5 sm:p-6 shadow-sm"><div className="flex items-center gap-2"><CreditCard size={19} className="text-[var(--mc-accent)]" /><h2 className="font-bold text-lg text-[var(--mc-ink)]">Payment method</h2></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{accountCustomer?.customerType === "B2B" ? (accountCustomer.creditEnabled ? <button type="button" disabled={accountCustomer.status !== "ACTIVE"} onClick={() => setMethod("CREDIT")} className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${method === "CREDIT" ? "border-[var(--mc-accent)] bg-white ring-2 ring-[var(--mc-accent)]" : "border-slate-200/90 bg-white hover:bg-slate-50"}`}><strong className="block text-[var(--mc-ink)]">Wallet balance</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Available {formatInr(accountCustomer.availableCredit)} · {accountCustomer.paymentTermsDays} day terms</span></button> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-left"><strong className="block text-[var(--mc-muted)]">Wallet balance</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Not enabled on your account yet. <Link href="/account/wallet" className="font-bold text-[var(--mc-accent)] underline">Request a top-up</Link> or contact Mahavir Card.</span></div>) : accountCustomer ? (Number(accountCustomer.availableCredit || 0) >= Number(cart.summary.total) ? <button type="button" disabled={accountCustomer.status !== "ACTIVE"} onClick={() => setMethod("CREDIT")} className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${method === "CREDIT" ? "border-[var(--mc-accent)] bg-white ring-2 ring-[var(--mc-accent)]" : "border-slate-200/90 bg-white hover:bg-slate-50"}`}><strong className="block text-[var(--mc-ink)]">Wallet balance</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Available {formatInr(accountCustomer.availableCredit)} · Prepaid</span></button> : <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-left"><strong className="block text-[var(--mc-muted)]">Wallet balance</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Available {formatInr(accountCustomer.availableCredit)} (Order: {formatInr(cart.summary.total)}). <Link href="/account/wallet" className="font-bold text-[var(--mc-accent)] underline">Top up wallet</Link> to pay using balance.</span></div>) : null}<button type="button" onClick={() => setMethod("COD")} className={`rounded-xl border p-4 text-left transition-colors ${method === "COD" ? "border-[var(--mc-accent)] bg-white ring-2 ring-[var(--mc-accent)]" : "border-slate-200/90 bg-white hover:bg-slate-50"}`}><strong className="block text-[var(--mc-ink)]">Cash on delivery</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Pay when the order is delivered.</span></button><button type="button" onClick={() => setMethod("UPI_QR")} className={`rounded-xl border p-4 text-left transition-colors ${method === "UPI_QR" ? "border-[var(--mc-accent)] bg-white ring-2 ring-[var(--mc-accent)]" : "border-slate-200/90 bg-white hover:bg-slate-50"}`}><strong className="block text-[var(--mc-ink)]">UPI QR / Bank Transfer</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Scan QR or transfer to bank, then attach screenshot proof.</span></button>{razorpayEnabled ? <button type="button" onClick={() => setMethod("RAZORPAY")} className={`rounded-xl border p-4 text-left transition-colors ${method === "RAZORPAY" ? "border-[var(--mc-accent)] bg-white ring-2 ring-[var(--mc-accent)]" : "border-slate-200/90 bg-white hover:bg-slate-50"}`}><strong className="block text-[var(--mc-ink)]">Razorpay</strong><span className="mt-1 block text-sm text-[var(--mc-muted)]">Pay securely online with Cards, UPI or NetBanking.</span></button> : null}</div>
      {method === "UPI_QR" ? (
        <div className="mt-5 space-y-4 rounded-xl border border-[#d2eade] mc-section-mint p-4 sm:p-5">
          <PaymentBankDetails
            customerType={accountCustomer?.customerType || "B2C"}
            amount={cart.summary.total}
            mandatoryProof={true}
            proofImageUrl={proofImageUrl}
            onProofUploaded={setProofImageUrl}
            onClearProof={() => setProofImageUrl(null)}
          />
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-[var(--mc-ink)]">
                12-Digit UPI Transaction Reference (UTR) <span className="font-normal text-[var(--mc-muted)]">(optional)</span>
              </span>
              <input
                value={utr}
                onChange={(event) => setUtr(event.target.value)}
                placeholder="e.g. 423456789012"
                className="w-full rounded-lg border border-[var(--mc-line)] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[var(--mc-accent)] transition-colors font-mono"
              />
            </label>
            <p className="mt-1 text-[11px] text-[var(--mc-muted)]">
              Entering your 12-digit UTR helps us verify and process your order faster.
            </p>
          </div>
        </div>
      ) : null}
      </section>{error ? <p role="alert" className="rounded-xl border border-[#efb7b7] bg-[#fff4f4] p-3 text-sm text-[#9b2525]">{error}{authRequired ? <Link href={`/login?next=${encodeURIComponent("/checkout")}`} className="ml-2 font-bold underline">Sign in</Link> : null}</p> : null}</div>
      <aside className="h-fit rounded-2xl border border-[#ede4d5] mc-section-beige p-5 xl:sticky xl:top-[116px] shadow-2xs"><p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">Order summary</p>{cart.items.length ? <div className="mt-4 rounded-xl border border-[#ede4d5]/80 bg-white p-4 shadow-2xs space-y-3">{cart.items.map((item, idx) => <div key={item.id} className={idx !== 0 ? "border-t border-[var(--mc-line)] pt-3" : ""}><div className="flex justify-between gap-3"><div><p className="font-bold text-[var(--mc-ink)]">{item.product.name}</p><p className="mt-1 text-xs text-[var(--mc-muted)]">Qty {item.quantity.toLocaleString("en-IN")} · {item.pricingSnapshot.applicableRule ?? "Configured"}</p>{item.pricingSnapshot.addons?.length ? <p className="mt-1 text-xs text-[#1e3a5f]">{item.pricingSnapshot.addons.map((a) => `${a.name} (${formatInr(a.price)})`).join(", ")}</p> : null}</div><strong className="text-[var(--mc-ink)]">{formatInr(item.calculatedAmount)}</strong></div></div>)}{cart.summary.hasTaxBreakdown ? <div className="space-y-2 border-t border-[var(--mc-line)] pt-3 text-sm text-[var(--mc-muted)]"><p className="flex justify-between"><span>Base products</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.productSubtotal)}</strong></p>{Number(cart.summary.addonSubtotal) > 0 ? <p className="flex justify-between"><span>Add-ons / extras</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.addonSubtotal)}</strong></p> : null}{Number(cart.summary.deliverySubtotal) > 0 ? <p className="flex justify-between"><span>Courier</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.deliverySubtotal)}</strong></p> : null}{Number(cart.summary.surchargeSubtotal) > 0 ? <p className="flex justify-between"><span>Other charges</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.surchargeSubtotal)}</strong></p> : null}<p className="flex justify-between border-t border-[var(--mc-line)] pt-2"><span>Taxable subtotal</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.priceBeforeTax)}</strong></p>{Number(cart.summary.cgst) > 0 ? <p className="flex justify-between"><span>CGST 9%</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.cgst)}</strong></p> : null}{Number(cart.summary.sgst) > 0 ? <p className="flex justify-between"><span>SGST 9%</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.sgst)}</strong></p> : null}{Number(cart.summary.igst) > 0 ? <p className="flex justify-between"><span>IGST 18%</span><strong className="text-[var(--mc-ink)]">{formatInr(cart.summary.igst)}</strong></p> : null}{cart.summary.roundOff && Math.abs(Number(cart.summary.roundOff)) > 0.001 ? <p className="flex justify-between text-xs text-slate-500"><span>Round off (paisa adjustment)</span><strong className={Number(cart.summary.roundOff) < 0 ? "text-emerald-700 font-bold" : "text-slate-700 font-bold"}>{formatRoundOff(cart.summary.roundOff)}</strong></p> : null}</div> : null}<div className="flex justify-between border-t border-[var(--mc-line)] pt-4 text-lg font-bold"><span>Grand total</span><span className="text-[var(--mc-accent-dark)]">{formatInr(cart.summary.total)}</span></div></div> : <p className="mt-4 text-sm text-[var(--mc-muted)]">Your basket is empty. <Link href="/products" className="font-bold text-[var(--mc-accent)]">Browse products</Link></p>}<button disabled={!cart.items.length || cart.summary.hasUnavailableItems || loading || submitting || (method === "UPI_QR" && !proofImageUrl) || (method === "CREDIT" && accountCustomer?.customerType === "B2C" && Number(accountCustomer.availableCredit || 0) < Number(cart.summary.total))} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-4 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Creating order..." : method === "CREDIT" ? "Pay from wallet balance" : method === "COD" ? "Place COD order" : method === "UPI_QR" ? (!proofImageUrl ? "Upload screenshot to place order" : "Submit Order with Payment Proof") : "Pay with Razorpay"}<ArrowRight size={16} /></button></aside>
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
