"use client";

import { Check, RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { adminRequest, asItems, formattedAmount, formattedDate } from "@/lib/admin-client";

type WalletRow = {
  transaction: { id: string; transactionType: string; status: string; amount: string; balanceAfter: string | null; reference: string | null; notes: string | null; createdAt: string };
  customer: { id: string; contactName: string; companyName: string; email: string; walletBalance: string };
};

export function WalletAdmin() {
  const [rows, setRows] = useState<WalletRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("PENDING");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setRows(asItems(await adminRequest<WalletRow[] | { items: WalletRow[] }>(`/api/admin/wallet${filter ? `?status=${filter}` : ""}`))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load wallet requests"); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const notes = window.prompt(decision === "APPROVED" ? "Optional approval note" : "Reason for rejection");
    if (notes === null) return;
    setSaving(id); setError("");
    try { await adminRequest(`/api/admin/wallet/${id}`, { method: "PATCH", body: JSON.stringify({ decision, notes: notes || null }) }); await load(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The request could not be reviewed"); }
    finally { setSaving(""); }
  }

  return <div>
    <header className="flex flex-col justify-between gap-4 border-b border-[#d7dce5] pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-[#2457b8]">Customer accounts</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Wallet requests</h1><p className="mt-2 text-sm text-[#607089]">Approve a top-up once to post it to the customer balance.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 border border-[#c9d2df] bg-white px-4 py-2.5 text-sm font-bold"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh</button></header>
    <div className="mt-5 flex gap-2">{["PENDING", "APPROVED", "REJECTED", ""].map((status) => <button key={status || "ALL"} type="button" onClick={() => setFilter(status)} className={`border px-3 py-2 text-sm font-semibold ${filter === status ? "border-[#2457b8] bg-[#eaf1ff] text-[#1f51ad]" : "border-[#c9d2df] bg-white text-[#52647e]"}`}>{status || "ALL"}</button>)}</div>
    {error ? <p role="alert" className="mt-5 border border-[#efc4be] bg-[#fff6f4] p-3 text-sm font-semibold text-[#a9362c]">{error}</p> : null}
    <section className="mt-5 overflow-x-auto border border-[#d7dce5] bg-white"><table className="min-w-[820px] w-full text-left text-sm"><thead className="bg-[#eef3fb] text-xs uppercase text-[#52647e]"><tr><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Request</th><th className="px-4 py-3">Current balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#e4e8ef]">{rows.map(({ transaction, customer }) => <tr key={transaction.id}><td className="px-4 py-4"><strong className="block">{customer.contactName}</strong><span className="text-xs text-[#607089]">{customer.companyName} · {customer.email}</span></td><td className="px-4 py-4"><strong>{formattedAmount(transaction.amount)}</strong><span className="mt-1 block text-xs text-[#607089]">{transaction.reference} · {formattedDate(transaction.createdAt)}</span></td><td className="px-4 py-4 font-semibold">{formattedAmount(transaction.balanceAfter ?? customer.walletBalance)}</td><td className="px-4 py-4"><span className="font-semibold">{transaction.status}</span>{transaction.notes ? <span className="mt-1 block max-w-xs text-xs text-[#607089]">{transaction.notes}</span> : null}</td><td className="px-4 py-4"><div className="flex justify-end gap-2">{transaction.status === "PENDING" ? <><button type="button" disabled={saving === transaction.id} onClick={() => void decide(transaction.id, "APPROVED")} className="inline-flex items-center gap-1.5 bg-[#2457b8] px-3 py-2 font-bold text-white disabled:opacity-50"><Check size={15} />Approve</button><button type="button" disabled={saving === transaction.id} onClick={() => void decide(transaction.id, "REJECTED")} className="inline-flex items-center gap-1.5 border border-[#efc4be] px-3 py-2 font-bold text-[#a9362c] disabled:opacity-50"><X size={15} />Reject</button></> : <span className="text-xs text-[#607089]">Reviewed</span>}</div></td></tr>)}{!loading && !rows.length ? <tr><td colSpan={5} className="px-4 py-10 text-center text-[#607089]">No wallet requests in this view.</td></tr> : null}</tbody></table>{loading ? <p className="p-6 text-sm text-[#607089]">Loading wallet requests...</p> : null}</section>
  </div>;
}
