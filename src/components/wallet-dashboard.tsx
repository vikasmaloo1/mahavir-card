"use client";

import Link from "next/link";
import { ArrowRight, CreditCard, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";

import { formatInr } from "@/lib/formatting";
import { UpiQrCode } from "@/components/upi-qr-code";

type WalletData = {
  customer: { customerType: string; creditEnabled: boolean; creditLimit: string; availableBalance: string; paymentTermsDays: number } | null;
  profileComplete: boolean;
  transactions: Array<{ id: string; transactionType: string; status: string; amount: string; reference: string | null; notes: string | null; createdAt: string }>;
};

export function WalletDashboard({ upiVpa }: { upiVpa: string }) {
  const [data, setData] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("");
  const [utr, setUtr] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch("/api/account/wallet/top-up", { cache: "no-store" });
    const payload = await response.json();
    if (payload.success) setData(payload.data);
    else setMessage(payload.error?.message ?? "Could not load balance");
  }
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const response = await fetch("/api/account/wallet/top-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), utr: utr.trim() || null }) });
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) { setMessage(payload.error?.message ?? "Top-up request failed"); return; }
    setAmount("");
    setUtr("");
    setMessage("Top-up request submitted. If you paid via UPI, we'll confirm your reference and credit your balance shortly.");
    await load();
  }

  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div className="flex items-center gap-3"><WalletCards className="text-[var(--mc-accent)]" /><div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Customer account</p><h1 className="mt-1 text-3xl font-bold text-[var(--mc-ink)]">Balance and top up</h1></div></div>
    {data && !data.profileComplete ? <section className="mt-7 rounded-xl border border-[#bfd1f3] bg-white p-6 shadow-sm"><h2 className="font-bold text-lg text-[var(--mc-ink)]">Complete your customer profile</h2><p className="mt-2 text-sm leading-6 text-[var(--mc-muted)]">Add your contact, city, and state details to activate balance and credit features.</p><Link href="/account/profile" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors">Complete profile <ArrowRight size={16} /></Link></section> : null}
    {data?.customer && data.profileComplete ? <>
      {data.customer.customerType === "B2B" ? (
        <div className="mt-7 grid gap-4 sm:grid-cols-3"><Balance label="Available balance" value={formatInr(data.customer.availableBalance)} /><Balance label="Credit limit" value={data.customer.creditEnabled ? formatInr(data.customer.creditLimit) : "Not enabled"} /><Balance label="Payment terms" value={data.customer.creditEnabled ? `${data.customer.paymentTermsDays} days` : "Prepaid"} /></div>
      ) : (
        <div className="mt-7 grid gap-4 sm:grid-cols-2"><Balance label="Available balance" value={formatInr(data.customer.availableBalance)} /><Balance label="How you pay" value="Prepaid — pay per order" /></div>
      )}
      <div className="mt-7 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <form onSubmit={submit} className="h-fit rounded-xl border border-[var(--mc-line)] bg-white p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2"><CreditCard size={18} className="text-[var(--mc-accent)]" /><h2 className="font-bold text-lg text-[var(--mc-ink)]">Add balance via UPI</h2></div>
          <p className="mt-1.5 text-xs leading-5 text-[var(--mc-muted)]">Enter an amount, scan the QR to pay directly (no gateway fee), then submit your UPI reference below.</p>
          <label className="mt-5 block"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">Amount (₹)</span><input required min="1" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 5000" className="w-full rounded-lg border border-[var(--mc-line)] px-3.5 py-3 outline-none focus:border-[var(--mc-accent)] transition-colors" /></label>
          {Number(amount) > 0 ? (
            <div className="mt-4">
              <UpiQrCode amount={Number(amount).toFixed(2)} note="Wallet top-up" upiId={upiVpa} />
            </div>
          ) : null}
          <label className="mt-4 block"><span className="mb-2 block text-sm font-semibold text-[var(--mc-ink)]">UPI reference (UTR) <span className="font-normal text-[var(--mc-muted)]">(optional, but speeds up confirmation)</span></span><input value={utr} onChange={(event) => setUtr(event.target.value)} placeholder="e.g. 402812345678" className="w-full rounded-lg border border-[var(--mc-line)] px-3.5 py-3 outline-none focus:border-[var(--mc-accent)] transition-colors" /></label>
          <button disabled={saving} className="mt-4 w-full rounded-full bg-[var(--mc-accent)] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[var(--mc-accent-dark)] transition-colors disabled:opacity-60">{saving ? "Submitting..." : "Submit top-up request"}</button>
          {message ? <p className="mt-3 text-sm text-[var(--mc-muted)]">{message}</p> : null}
        </form>
        <section className="rounded-xl border border-[var(--mc-line)] bg-white shadow-sm overflow-hidden"><h2 className="border-b border-[var(--mc-line)] p-5 font-bold text-lg text-[var(--mc-ink)]">Balance activity</h2>{data.transactions.length ? data.transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-4 border-b border-[var(--mc-line)] px-5 py-4 last:border-0 hover:bg-[var(--mc-surface)] transition-colors"><div><p className="font-semibold text-[var(--mc-ink)]">{transaction.transactionType.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--mc-muted)]">{transaction.reference || "Account adjustment"} · {transaction.status}</p>{transaction.notes ? <p className="mt-0.5 text-xs text-[var(--mc-muted)]">{transaction.notes}</p> : null}</div><strong className="text-[var(--mc-accent-dark)]">{formatInr(transaction.amount)}</strong></div>) : <p className="p-5 text-sm text-[var(--mc-muted)]">No balance activity yet.</p>}</section>
      </div>
    </> : null}
    {!data ? <WalletSkeleton /> : null}
  </main>;
}

function Balance({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase text-[var(--mc-muted)]">{label}</p><p className="mt-2 text-2xl font-bold text-[var(--mc-ink)]">{value}</p></div>; }

function WalletSkeleton() {
  return (
    <div className="py-8 animate-pulse space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="rounded-xl border border-[var(--mc-line)] bg-white p-5 h-28" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-64" />
        <div className="rounded-xl border border-[var(--mc-line)] bg-white p-6 h-80" />
      </div>
    </div>
  );
}
