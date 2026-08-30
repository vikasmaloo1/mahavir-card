"use client";

import { useEffect, useState } from "react";
import { CreditCard, WalletCards } from "lucide-react";

import { formatInr } from "@/lib/formatting";

type WalletData = { customer: { walletBalance: string; creditEnabled: boolean; creditLimit: string; availableCredit: string; paymentTermsDays: number }; transactions: Array<{ id: string; transactionType: string; status: string; amount: string; reference: string | null; createdAt: string }> };
const money = formatInr;

export function WalletDashboard() {
  const [data, setData] = useState<WalletData | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function load() { const response = await fetch("/api/account/wallet/top-up", { cache: "no-store" }); const payload = await response.json(); if (payload.success) setData(payload.data); else setMessage(payload.error?.message ?? "Could not load balance"); }
  useEffect(() => { const timer = window.setTimeout(() => { void load(); }, 0); return () => window.clearTimeout(timer); }, []);
  async function submit(event: React.FormEvent) { event.preventDefault(); setSaving(true); setMessage(""); const response = await fetch("/api/account/wallet/top-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount) }) }); const payload = await response.json(); setSaving(false); if (!response.ok) { setMessage(payload.error?.message ?? "Top-up request failed"); return; } setAmount(""); setMessage("Top-up request submitted for approval."); await load(); }
  return <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6"><div className="flex items-center gap-3"><WalletCards className="text-[var(--mc-accent)]" /><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--mc-accent)]">Customer balance</p><h1 className="mt-1 text-3xl font-bold">Wallet and credit</h1></div></div>{data ? <><div className="mt-7 grid gap-4 sm:grid-cols-3"><Balance label="Wallet balance" value={money(data.customer.walletBalance)} /><Balance label="Available credit" value={data.customer.creditEnabled ? money(data.customer.availableCredit) : "Not enabled"} /><Balance label="Payment terms" value={data.customer.creditEnabled ? `${data.customer.paymentTermsDays} days` : "Prepaid"} /></div><div className="mt-7 grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]"><form onSubmit={submit} className="h-fit border border-[var(--mc-line)] bg-white p-5"><div className="flex items-center gap-2"><CreditCard size={18} className="text-[var(--mc-accent)]" /><h2 className="font-bold">Balance top-up</h2></div><label className="mt-5 block"><span className="mb-2 block text-sm font-semibold">Amount</span><input required min="1" step="0.01" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full border border-[var(--mc-line)] px-3 py-3 outline-none focus:border-[var(--mc-accent)]" /></label><button disabled={saving} className="mt-4 w-full rounded-full bg-[var(--mc-accent)] px-4 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? "Submitting..." : "Request top-up"}</button>{message ? <p className="mt-3 text-sm text-[var(--mc-muted)]">{message}</p> : null}</form><section className="border border-[var(--mc-line)] bg-white"><h2 className="border-b border-[var(--mc-line)] p-5 font-bold">Balance activity</h2>{data.transactions.length ? data.transactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-4 border-b border-[var(--mc-line)] px-5 py-4 last:border-0"><div><p className="font-semibold">{transaction.transactionType.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--mc-muted)]">{transaction.reference} · {transaction.status}</p></div><strong>{money(transaction.amount)}</strong></div>) : <p className="p-5 text-sm text-[var(--mc-muted)]">No balance activity yet.</p>}</section></div></> : <p className="mt-6 text-sm text-[var(--mc-muted)]">{message || "Loading balance..."}</p>}</main>;
}

function Balance({ label, value }: { label: string; value: string }) { return <div className="border border-[var(--mc-line)] bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--mc-muted)]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }
