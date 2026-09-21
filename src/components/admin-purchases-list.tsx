"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, Plus, Search, Trash2, Pencil } from "lucide-react";

type Purchase = {
  id: string;
  date: string;
  partyName: string;
  partyGstin: string | null;
  billNo: string;
  hsnCode: string;
  qty: string | null;
  qtyUnit: string | null;
  taxValue: string;
  cgstRate: string;
  cgstAmount: string;
  sgstRate: string;
  sgstAmount: string;
  igstRate: string;
  igstAmount: string;
  roundOff: string;
  totalValue: string;
  description?: string | null;
  items?: any[] | null;
};

function fmt(v: string | null | undefined) { return Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function getPeriodDates(period: string): { from: string; to: string } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  if (period === "today") return { from: iso(now), to: iso(now) };
  if (period === "week") {
    const day = now.getDay(); const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(now); start.setDate(diff);
    return { from: iso(start), to: iso(now) };
  }
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: iso(start), to: iso(now) };
  }
  return { from: "", to: "" };
}

export function AdminPurchasesList() {
  const [rows, setRows] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activePeriod, setActivePeriod] = useState("month");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const limit = 50;

  const fetch_ = useCallback(async (q: string, from: string, to: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ query: q, dateFrom: from, dateTo: to, page: String(p), limit: String(limit) });
      const res = await fetch(`/api/admin/purchases?${params}`);
      const json = await res.json();
      if (json.success) { setRows(json.data.purchases); setTotal(json.data.pagination.total); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const { from, to } = getPeriodDates(activePeriod);
    if (activePeriod !== "custom") { setDateFrom(from); setDateTo(to); }
    fetch_(query, from, to, page);
  }, [activePeriod, page]);

  const handleSearch = () => fetch_(query, dateFrom, dateTo, 1);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this purchase entry?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/purchases/${id}`, { method: "DELETE" });
      fetch_(query, dateFrom, dateTo, page);
    } finally { setDeleting(null); }
  };

  const totalPages = Math.ceil(total / limit);
  const sumTaxValue = rows.reduce((s, r) => s + Number(r.taxValue), 0);
  const sumCgst = rows.reduce((s, r) => s + Number(r.cgstAmount), 0);
  const sumSgst = rows.reduce((s, r) => s + Number(r.sgstAmount), 0);
  const sumIgst = rows.reduce((s, r) => s + Number(r.igstAmount), 0);
  const sumRoundOff = rows.reduce((s, r) => s + Number(r.roundOff), 0);
  const sumTotal = rows.reduce((s, r) => s + Number(r.totalValue), 0);

  const downloadExcel = () => {
    const period = activePeriod === "today" ? "daily" : activePeriod === "week" ? "weekly" : activePeriod === "month" ? "monthly" : "custom";
    const url = `/api/admin/reports/sales-excel?type=PURCHASE&period=${period}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#162237]">Purchases</h1>
          <p className="mt-0.5 text-sm text-[#607089]">Manually log raw material and supply purchases</p>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="inline-flex items-center gap-2 rounded-lg border border-[#d7dce5] bg-white px-3 py-2 text-sm font-semibold text-[#607089] hover:bg-[#f5f7fa] transition-colors">
            <Download size={15} /> Download Excel
          </button>
          <Link href="/admin/purchases/new" className="inline-flex items-center gap-2 rounded-lg bg-[#7B3F8D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6a3479] transition-colors">
            <Plus size={15} /> Add Purchase
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[#d7dce5] bg-white p-4 space-y-3">
        {/* Period pills */}
        <div className="flex flex-wrap gap-2">
          {[["today","Today"],["week","This Week"],["month","This Month"],["custom","Custom Range"]].map(([v, l]) => (
            <button key={v} onClick={() => setActivePeriod(v)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${activePeriod === v ? "bg-[#7B3F8D] text-white" : "bg-[#f5f7fa] text-[#607089] hover:bg-[#e8ecf1]"}`}
            >{l}</button>
          ))}
        </div>
        {/* Date + search row */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-2 py-1.5">
            <CalendarDays size={14} className="text-[#607089]" />
            <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setActivePeriod("custom"); }} className="bg-transparent text-sm text-[#162237] focus:outline-none" />
            <span className="text-[#607089]">–</span>
            <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setActivePeriod("custom"); }} className="bg-transparent text-sm text-[#162237] focus:outline-none" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-1.5 min-w-[180px]">
            <Search size={14} className="text-[#607089]" />
            <input type="text" placeholder="Search party / bill no / GSTIN…" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="flex-1 bg-transparent text-sm text-[#162237] placeholder-[#a0aec0] focus:outline-none" />
          </div>
          <button onClick={handleSearch} className="rounded-lg bg-[#7B3F8D] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#6a3479]">Apply</button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#d7dce5] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#d7dce5] bg-[#7B3F8D] text-white">
              {["DATE","PARTY NAME","BILL NO","HSN CODE","TAX VALUE","CGST","SGST","IGST","R OFF","TOTAL VALUE","RATE%","PARTY GSTIN",""].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-bold tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={13} className="py-12 text-center text-[#607089]">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={13} className="py-12 text-center text-[#607089]">No purchase entries found</td></tr>
            ) : rows.map((r, i) => {
              const gstRate = Number(r.cgstRate) + Number(r.sgstRate) + Number(r.igstRate);
              return (
                <tr key={r.id} className={`border-b border-[#f0f0f0] hover:bg-[#fdf7ff] ${i % 2 === 0 ? "bg-white" : "bg-[#faf5fb]"}`}>
                  <td className="whitespace-nowrap px-3 py-2 text-[#607089]">{new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                  <td className="px-3 py-2 font-medium text-[#162237]">
                    <div>{r.partyName}</div>
                    {r.description ? (
                      <div className="text-[11px] text-slate-500 truncate max-w-xs">{r.description}</div>
                    ) : r.items && r.items.length > 0 ? (
                      <div className="text-[11px] text-[#7B3F8D] font-semibold">{r.items.length} items</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-[#607089]">{r.billNo}</td>
                  <td className="px-3 py-2 text-[#607089]">{r.hsnCode}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#162237]">{fmt(r.taxValue)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#607089]">{fmt(r.cgstAmount)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#607089]">{fmt(r.sgstAmount)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#607089]">{fmt(r.igstAmount)}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#607089]">{fmt(r.roundOff)}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold text-[#162237]">{fmt(r.totalValue)}</td>
                  <td className="px-3 py-2 text-center text-[#607089]">{gstRate}%</td>
                  <td className="px-3 py-2 font-mono text-xs text-[#607089]">{r.partyGstin || "—"}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/purchases/${r.id}`} className="rounded p-1 text-[#607089] hover:bg-[#f5f7fa] hover:text-[#7B3F8D]"><Pencil size={14} /></Link>
                      <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id} className="rounded p-1 text-[#607089] hover:bg-red-50 hover:text-red-600 disabled:opacity-50"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#d7dce5] bg-[#C0392B] text-white font-bold">
                <td className="px-3 py-2" colSpan={4}>TOTAL ({rows.length} entries)</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(String(sumTaxValue))}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(String(sumCgst))}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(String(sumSgst))}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(String(sumIgst))}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(String(sumRoundOff))}</td>
                <td className="px-3 py-2 text-right font-mono">{fmt(String(sumTotal))}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-[#607089]">
          <span>{total} total entries</span>
          <div className="flex gap-1">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded px-3 py-1.5 border border-[#d7dce5] hover:bg-[#f5f7fa] disabled:opacity-50">← Prev</button>
            <span className="px-3 py-1.5 font-medium text-[#162237]">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded px-3 py-1.5 border border-[#d7dce5] hover:bg-[#f5f7fa] disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}