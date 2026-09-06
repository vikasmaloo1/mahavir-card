"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";

import { formatInr } from "@/lib/formatting";
import { UpiQrCode } from "@/components/upi-qr-code";

/**
 * Pays for an order that already exists without a payment attached — the case a
 * quote-accept produces (checkout's own flow always creates order+payment together,
 * so this fills the gap for the accept-quote path). Scoped to COD and UPI QR only:
 * Razorpay's actual gateway order + key are only ever created inside /api/checkout,
 * and POST /api/orders/[id]/payment doesn't create one, so wiring Razorpay in here
 * would silently mark a payment PENDING with no way to actually collect it.
 */
export function OrderPaymentAction({ orderId, amount, upiVpa, onPaid }: { orderId: string; amount: string; upiVpa: string; onPaid: () => void }) {
  const [method, setMethod] = useState<"COD" | "UPI_QR" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(false);
  const [utr, setUtr] = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);

  async function choose(selected: "COD" | "UPI_QR") {
    setMethod(selected);
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/orders/${orderId}/payment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, method: selected, amount }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Could not start payment for this order");
      if (selected === "COD") { setPaid(true); onPaid(); }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start payment for this order");
      setMethod(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitUtr(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUtrSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/payments/upi/submit-reference", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, utr: utr.trim() }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message ?? "Could not save your payment reference");
      setUtrSubmitted(true);
      onPaid();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save your payment reference");
    } finally {
      setUtrSubmitting(false);
    }
  }

  if (paid) return <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Cash on delivery recorded — pending collection.</p>;
  if (utrSubmitted) return <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Payment reference submitted. We&apos;ll confirm it shortly.</p>;

  if (method === "UPI_QR") {
    return (
      <div className="mt-4 border-t border-[var(--mc-line)] pt-4">
        <p className="text-sm font-bold text-[var(--mc-ink)]">Pay {formatInr(amount)} via UPI</p>
        <div className="mt-3"><UpiQrCode amount={amount} note={`Order payment`} upiId={upiVpa} /></div>
        <form onSubmit={submitUtr} className="mt-4 space-y-2">
          <label className="block text-xs font-bold uppercase text-[var(--mc-muted)]">UPI transaction reference (UTR)</label>
          <input required value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="Enter 12-digit UPI reference" className="w-full rounded-lg border border-[var(--mc-line)] px-3 py-2.5 text-sm outline-none focus:border-[var(--mc-accent)]" />
          {error ? <p className="text-xs font-semibold text-[#9b2525]">{error}</p> : null}
          <button disabled={utrSubmitting} className="w-full rounded-full bg-[var(--mc-accent)] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">{utrSubmitting ? "Saving..." : "I've paid — submit reference"}</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-[var(--mc-line)] pt-4">
      <p className="flex items-center gap-2 text-sm font-bold text-[var(--mc-ink)]"><CreditCard size={16} className="text-[var(--mc-accent)]" />Payment required — {formatInr(amount)}</p>
      {error ? <p className="mt-2 text-xs font-semibold text-[#9b2525]">{error}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={submitting} onClick={() => void choose("UPI_QR")} className="rounded-full border border-[var(--mc-line)] bg-white px-4 py-2 text-xs font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] disabled:opacity-60">Pay via UPI</button>
        <button type="button" disabled={submitting} onClick={() => void choose("COD")} className="rounded-full border border-[var(--mc-line)] bg-white px-4 py-2 text-xs font-bold text-[var(--mc-ink)] hover:bg-[var(--mc-surface)] disabled:opacity-60">Cash on delivery</button>
      </div>
    </div>
  );
}
