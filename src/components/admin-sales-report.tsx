"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Receipt,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";

type ReportType = "COMBINED" | "B2C" | "B2B" | "PURCHASE";
type Period = "daily" | "weekly" | "monthly" | "custom";

interface ListingRow {
  date: string;
  partyName: string;
  qty: number | null;
  billNo: string;
  hsnCode: string;
  taxValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  totalValue: number;
  rate: number;
  partyGstin: string;
}

interface Totals {
  taxValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  totalValue: number;
}

interface ListingData {
  success: boolean;
  type: string;
  period: string;
  dateFrom: string;
  dateTo: string;
  salesTitle: string;
  purchaseTitle: string;
  sales: ListingRow[];
  salesTotals: Totals;
  purchases: ListingRow[];
  purchaseTotals: Totals;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getMonthRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  const dateFrom = `${year}-${pad(month + 1)}-01`;
  const last = new Date(year, month + 1, 0);
  return { dateFrom, dateTo: `${year}-${pad(month + 1)}-${pad(last.getDate())}` };
}

function getWeekRange(dateStr: string): { dateFrom: string; dateTo: string } {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d);
  start.setDate(diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    dateFrom: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    dateTo: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`,
  };
}

function formatInr(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0.00";
  return val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AdminSalesReport() {
  const now = new Date();
  const [reportType, setReportType] = useState<ReportType>("COMBINED");
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [weekDate, setWeekDate] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [directDownloadingType, setDirectDownloadingType] = useState<string | null>(null);

  // Listing View States
  const [listingData, setListingData] = useState<ListingData | null>(null);
  const [loadingListing, setLoadingListing] = useState<boolean>(false);
  const [listingError, setListingError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const getParams = (): { dateFrom: string; dateTo: string } => {
    if (period === "daily") return { dateFrom: selectedDay, dateTo: selectedDay };
    if (period === "weekly") return getWeekRange(weekDate);
    if (period === "monthly") return getMonthRange(selectedYear, selectedMonth);
    return { dateFrom: customFrom, dateTo: customTo };
  };

  const { dateFrom, dateTo } = getParams();

  // Fetch listing data whenever filters change
  const fetchListingData = async () => {
    if (!dateFrom || (period === "custom" && (!customFrom || !customTo))) return;
    setLoadingListing(true);
    setListingError(null);
    try {
      const url = `/api/admin/reports/sales-excel?format=json&type=${reportType}&period=${period}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load listing records");
      const json = await res.json();
      setListingData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error fetching report listing";
      setListingError(msg);
    } finally {
      setLoadingListing(false);
    }
  };

  useEffect(() => {
    fetchListingData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, period, selectedMonth, selectedYear, selectedDay, weekDate, customFrom, customTo]);

  const triggerDownload = async (type: ReportType, p: Period, dFrom: string, dTo: string) => {
    if (!dFrom) {
      alert("Please select a valid date range");
      return;
    }
    const url = `/api/admin/reports/sales-excel?type=${type}&period=${p}&dateFrom=${dFrom}&dateTo=${dTo}`;
    const res = await fetch(url);
    if (!res.ok) {
      alert("Failed to generate report");
      return;
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${type}_Report_${dFrom}_${dTo}.xlsx`;
    a.click();
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await triggerDownload(reportType, period, dateFrom, dateTo);
    } finally {
      setDownloading(false);
    }
  };

  const handleQuickDownload = async (type: ReportType) => {
    const mRange = getMonthRange(now.getFullYear(), now.getMonth());
    setDirectDownloadingType(type);
    try {
      await triggerDownload(type, "monthly", mRange.dateFrom, mRange.dateTo);
    } finally {
      setDirectDownloadingType(null);
    }
  };

  const rangeLabel = dateFrom && dateTo
    ? `${new Date(dateFrom).toLocaleDateString("en-IN")} — ${new Date(dateTo).toLocaleDateString("en-IN")}`
    : "Select date range";

  const themeColors: Record<ReportType, { bg: string; hover: string; light: string; border: string; label: string }> = {
    COMBINED: { bg: "#0F766E", hover: "#115E59", light: "#F0FDFA", border: "#99F6E4", label: "SALES + PURCHASE (1 TAB)" },
    B2C: { bg: "#1A6E8E", hover: "#155A76", light: "#F0F8FB", border: "#CCE4EF", label: "SALE B2C (COUNTER & ONLINE)" },
    B2B: { bg: "#7B3F8D", hover: "#6A3479", light: "#FAF5FB", border: "#EEDBF2", label: "SALE B2B (CORPORATE)" },
    PURCHASE: { bg: "#2E7D32", hover: "#236527", light: "#F1F8F3", border: "#D0E9D4", label: "PURCHASE REGISTER" },
  };

  const activeTheme = themeColors[reportType];

  // Filtering for on-screen search
  const q = searchQuery.toLowerCase().trim();
  const filterRows = (rows: ListingRow[] | undefined) => {
    if (!rows) return [];
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.partyName.toLowerCase().includes(q) ||
        r.billNo.toLowerCase().includes(q) ||
        r.partyGstin.toLowerCase().includes(q) ||
        r.date.includes(q)
    );
  };

  const displayedSales = filterRows(listingData?.sales);
  const displayedPurchases = filterRows(listingData?.purchases);

  const showSales = reportType === "COMBINED" || reportType === "B2C" || reportType === "B2B";
  const showPurchases = reportType === "COMBINED" || reportType === "PURCHASE";

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#162237]">Sales & Purchase Report</h1>
          <p className="mt-1 text-sm text-[#607089]">
            Live on-screen listing view with exact GST Excel (.xlsx) export
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 rounded-xl py-2.5 px-5 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60 shrink-0"
          style={{ backgroundColor: activeTheme.bg }}
        >
          {downloading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Downloading…
            </>
          ) : (
            <>
              <Download size={16} />
              Download Excel (.xlsx)
            </>
          )}
        </button>
      </div>

      {/* Main Configuration Card */}
      <div className="rounded-2xl border border-[#d7dce5] bg-white p-5 shadow-sm space-y-5">
        {/* Step 1: Report Format Selector */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#607089]">
              1. Choose Report Type
            </label>
            <span className="text-[11px] font-semibold text-[#0F766E] bg-[#F0FDFA] px-2.5 py-0.5 rounded-full border border-[#99F6E4]">
              Sales + Purchase in 1 Tab Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {[
              {
                id: "COMBINED" as ReportType,
                title: "Sales + Purchase",
                subtitle: "Both in 1 tab (10 rows gap)",
                color: "#0F766E",
                badge: "Recommended",
              },
              {
                id: "B2C" as ReportType,
                title: "Sale B2C",
                subtitle: "Store bills + Retail",
                color: "#1A6E8E",
              },
              {
                id: "B2B" as ReportType,
                title: "Sale B2B",
                subtitle: "GST corporate orders",
                color: "#7B3F8D",
              },
              {
                id: "PURCHASE" as ReportType,
                title: "Purchase Only",
                subtitle: "Raw material & supplies",
                color: "#2E7D32",
              },
            ].map((t) => {
              const isActive = reportType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setReportType(t.id)}
                  className={`flex flex-col items-start justify-between rounded-xl border-2 p-3 text-left transition-all relative ${
                    isActive
                      ? "border-transparent text-white shadow-sm"
                      : "border-[#e2e8f0] bg-[#f8fafc] text-[#607089] hover:bg-[#f1f5f9] hover:border-[#cbd5e1]"
                  }`}
                  style={isActive ? { backgroundColor: t.color } : undefined}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className={`text-sm font-bold ${isActive ? "text-white" : "text-[#162237]"}`}>
                      {t.title}
                    </span>
                    {isActive ? (
                      <CheckCircle2 size={16} className="text-white shrink-0" />
                    ) : t.badge ? (
                      <span className="text-[9px] font-extrabold uppercase tracking-wide bg-[#0F766E]/10 text-[#0F766E] px-1.5 py-0.5 rounded">
                        {t.badge}
                      </span>
                    ) : null}
                  </div>
                  <span className={`text-xs mt-1.5 line-clamp-2 ${isActive ? "text-white/90" : "text-[#718096]"}`}>
                    {t.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2 & 3: Period Filter and Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#f1f5f9]">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#607089]">
              2. Time Period
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "monthly" as Period, label: "Monthly" },
                { id: "weekly" as Period, label: "Weekly" },
                { id: "daily" as Period, label: "Daily" },
                { id: "custom" as Period, label: "Custom Range" },
              ].map((p) => {
                const isSelected = period === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriod(p.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
                      isSelected
                        ? "bg-[#162237] text-white border-[#162237] shadow-sm"
                        : "bg-white text-[#4a5568] border-[#d7dce5] hover:bg-[#f7fafc]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#607089]">
              3. Date Range
            </label>
            {period === "monthly" && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3 py-1.5 text-xs font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3 py-1.5 text-xs font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#718096]">Full calendar month</span>
              </div>
            )}

            {period === "weekly" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={weekDate}
                  onChange={(e) => setWeekDate(e.target.value)}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3 py-1.5 text-xs font-medium text-[#162237] shadow-sm"
                />
                <span className="text-[11px] text-[#718096]">
                  Week: {getWeekRange(weekDate).dateFrom} to {getWeekRange(weekDate).dateTo}
                </span>
              </div>
            )}

            {period === "daily" && (
              <div>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3 py-1.5 text-xs font-medium text-[#162237] shadow-sm"
                />
              </div>
            )}

            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3 py-1.5 text-xs font-medium text-[#162237] shadow-sm"
                />
                <span className="text-xs text-[#718096]">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3 py-1.5 text-xs font-medium text-[#162237] shadow-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {listingData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-teal-800">
              <span className="text-xs font-bold uppercase tracking-wider">Total Sales</span>
              <ArrowUpCircle size={18} className="text-teal-600" />
            </div>
            <p className="mt-2 text-xl font-extrabold text-teal-950">
              ₹{formatInr(listingData.salesTotals?.totalValue)}
            </p>
            <p className="text-[11px] font-medium text-teal-700 mt-0.5">
              Taxable: ₹{formatInr(listingData.salesTotals?.taxValue)} ({listingData.sales?.length || 0} bills)
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-emerald-800">
              <span className="text-xs font-bold uppercase tracking-wider">Total Purchases</span>
              <ArrowDownCircle size={18} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-xl font-extrabold text-emerald-950">
              ₹{formatInr(listingData.purchaseTotals?.totalValue)}
            </p>
            <p className="text-[11px] font-medium text-emerald-700 mt-0.5">
              Taxable: ₹{formatInr(listingData.purchaseTotals?.taxValue)} ({listingData.purchases?.length || 0} bills)
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-indigo-800">
              <span className="text-xs font-bold uppercase tracking-wider">Total Sales GST</span>
              <Receipt size={18} className="text-indigo-600" />
            </div>
            <p className="mt-2 text-xl font-extrabold text-indigo-950">
              ₹{formatInr(
                (listingData.salesTotals?.cgst || 0) +
                (listingData.salesTotals?.sgst || 0) +
                (listingData.salesTotals?.igst || 0)
              )}
            </p>
            <p className="text-[11px] font-medium text-indigo-700 mt-0.5">
              CGST + SGST + IGST Output
            </p>
          </div>

          <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 shadow-sm">
            <div className="flex items-center justify-between text-purple-800">
              <span className="text-xs font-bold uppercase tracking-wider">Purchase GST (ITC)</span>
              <FileSpreadsheet size={18} className="text-purple-600" />
            </div>
            <p className="mt-2 text-xl font-extrabold text-purple-950">
              ₹{formatInr(
                (listingData.purchaseTotals?.cgst || 0) +
                (listingData.purchaseTotals?.sgst || 0) +
                (listingData.purchaseTotals?.igst || 0)
              )}
            </p>
            <p className="text-[11px] font-medium text-purple-700 mt-0.5">
              CGST + SGST + IGST Input Tax Credit
            </p>
          </div>
        </div>
      )}

      {/* Search & Listing Section Header */}
      <div className="rounded-2xl border border-[#d7dce5] bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#e2e8f0] bg-[#f8fafc] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Eye size={18} className="text-[#0F766E]" />
            <h2 className="text-sm font-bold text-[#162237]">
              Report Listing View ({rangeLabel})
            </h2>
            <span className="text-[11px] font-bold text-[#607089] bg-white px-2 py-0.5 rounded-md border border-[#e2e8f0]">
              Chronological (Earliest date first → Latest date last)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search party, bill no, gstin…"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#d7dce5] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
              />
            </div>
            <button
              type="button"
              onClick={fetchListingData}
              disabled={loadingListing}
              className="p-2 rounded-lg border border-[#d7dce5] bg-white text-[#4a5568] hover:bg-[#f1f5f9] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loadingListing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loadingListing && (
          <div className="p-12 text-center text-[#607089]">
            <Loader2 size={32} className="animate-spin mx-auto text-[#0F766E] mb-2" />
            <p className="text-sm font-medium">Loading report records…</p>
          </div>
        )}

        {/* Error State */}
        {!loadingListing && listingError && (
          <div className="p-8 text-center text-red-600">
            <p className="text-sm font-semibold">{listingError}</p>
            <button
              type="button"
              onClick={fetchListingData}
              className="mt-3 px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loaded Tables */}
        {!loadingListing && listingData && (
          <div className="divide-y divide-[#e2e8f0]">
            {/* 1. SALES REGISTER TABLE */}
            {showSales && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1A6E8E]" />
                    <h3 className="text-sm font-extrabold text-[#162237] tracking-wide">
                      {listingData.salesTitle}
                    </h3>
                    <span className="text-xs font-semibold text-[#607089]">
                      ({displayedSales.length} {displayedSales.length === 1 ? "entry" : "entries"})
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#1A6E8E] bg-[#F0F8FB] px-2.5 py-0.5 rounded-md border border-[#CCE4EF]">
                    SALES REGISTER
                  </span>
                </div>

                {displayedSales.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#94a3b8] italic bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0]">
                    No sales records found for this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#cbd5e1] shadow-xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-[#7C5A96] text-white font-bold text-[11px] uppercase">
                          <th className="py-2.5 px-3 border-r border-[#9674b0] text-center w-24">DATE</th>
                          <th className="py-2.5 px-3 border-r border-[#9674b0] min-w-[200px]">PARTY NAME</th>
                          <th className="py-2.5 px-2 border-r border-[#9674b0] text-center w-14">QTY.</th>
                          <th className="py-2.5 px-2.5 border-r border-[#9674b0] text-center w-20">BILL NO</th>
                          <th className="py-2.5 px-2.5 border-r border-[#9674b0] text-center w-20">HSN CODE</th>
                          <th className="py-2.5 px-3 border-r border-[#9674b0] text-right w-24">TAX VALUE</th>
                          <th className="py-2.5 px-2.5 border-r border-[#9674b0] text-right w-20">C.GST</th>
                          <th className="py-2.5 px-2.5 border-r border-[#9674b0] text-right w-20">SGST</th>
                          <th className="py-2.5 px-2.5 border-r border-[#9674b0] text-right w-20">IGST</th>
                          <th className="py-2.5 px-2 border-r border-[#9674b0] text-right w-16">R OFF</th>
                          <th className="py-2.5 px-3 border-r border-[#9674b0] text-right w-28 bg-[#6A4984]">TOTAL VALUE</th>
                          <th className="py-2.5 px-2 border-r border-[#9674b0] text-center w-16">RATE %</th>
                          <th className="py-2.5 px-3 text-left w-36">PARTY GSTIN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {displayedSales.map((r, idx) => (
                          <tr
                            key={`sale-${r.billNo}-${idx}`}
                            className="even:bg-[#f8fafc] odd:bg-white hover:bg-amber-50/60 transition-colors"
                          >
                            <td className="py-2 px-3 text-center font-medium text-[#475569] border-r border-[#e2e8f0] whitespace-nowrap">
                              {r.date}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[#0f172a] border-r border-[#e2e8f0]">
                              {r.partyName}
                            </td>
                            <td className="py-2 px-2 text-center text-[#64748b] border-r border-[#e2e8f0]">
                              {r.qty ?? "—"}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-medium text-[#1e293b] border-r border-[#e2e8f0]">
                              {r.billNo}
                            </td>
                            <td className="py-2 px-2.5 text-center text-[#64748b] border-r border-[#e2e8f0]">
                              {r.hsnCode}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-[#0f172a] border-r border-[#e2e8f0]">
                              {formatInr(r.taxValue)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-[#475569] border-r border-[#e2e8f0]">
                              {formatInr(r.cgst)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-[#475569] border-r border-[#e2e8f0]">
                              {formatInr(r.sgst)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-[#475569] border-r border-[#e2e8f0]">
                              {formatInr(r.igst)}
                            </td>
                            <td className="py-2 px-2 text-right text-[#94a3b8] border-r border-[#e2e8f0]">
                              {formatInr(r.roundOff)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#0f172a] border-r border-[#e2e8f0] bg-slate-50/50">
                              {formatInr(r.totalValue)}
                            </td>
                            <td className="py-2 px-2 text-center text-[#64748b] border-r border-[#e2e8f0]">
                              {r.rate}%
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#475569] uppercase">
                              {r.partyGstin || "—"}
                            </td>
                          </tr>
                        ))}

                        {/* Red Totals Row matching Excel */}
                        <tr className="bg-[#C00000] text-white font-bold text-[11px] tracking-wide">
                          <td colSpan={2} className="py-2.5 px-3 text-center border-r border-[#df3a3a] uppercase">
                            TOTAL ({displayedSales.length} RECORDS)
                          </td>
                          <td className="py-2.5 px-2 border-r border-[#df3a3a] text-center">—</td>
                          <td className="py-2.5 px-2.5 border-r border-[#df3a3a] text-center">—</td>
                          <td className="py-2.5 px-2.5 border-r border-[#df3a3a] text-center">—</td>
                          <td className="py-2.5 px-3 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.salesTotals?.taxValue)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.salesTotals?.cgst)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.salesTotals?.sgst)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.salesTotals?.igst)}
                          </td>
                          <td className="py-2.5 px-2 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.salesTotals?.roundOff)}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-[#df3a3a] bg-[#9e0202]">
                            {formatInr(listingData.salesTotals?.totalValue)}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-[#df3a3a]">—</td>
                          <td className="py-2.5 px-3 text-left">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 2. PURCHASE REGISTER TABLE */}
            {showPurchases && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
                    <h3 className="text-sm font-extrabold text-[#162237] tracking-wide">
                      {listingData.purchaseTitle}
                    </h3>
                    <span className="text-xs font-semibold text-[#607089]">
                      ({displayedPurchases.length} {displayedPurchases.length === 1 ? "entry" : "entries"})
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#2E7D32] bg-[#F1F8F3] px-2.5 py-0.5 rounded-md border border-[#D0E9D4]">
                    PURCHASE REGISTER
                  </span>
                </div>

                {displayedPurchases.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#94a3b8] italic bg-[#f8fafc] rounded-xl border border-dashed border-[#e2e8f0]">
                    No purchase records found for this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-[#cbd5e1] shadow-xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                      <thead>
                        <tr className="bg-[#2E7D32] text-white font-bold text-[11px] uppercase">
                          <th className="py-2.5 px-3 border-r border-[#3d9a42] text-center w-24">DATE</th>
                          <th className="py-2.5 px-3 border-r border-[#3d9a42] min-w-[200px]">PARTY NAME</th>
                          <th className="py-2.5 px-2 border-r border-[#3d9a42] text-center w-14">QTY.</th>
                          <th className="py-2.5 px-2.5 border-r border-[#3d9a42] text-center w-20">BILL NO</th>
                          <th className="py-2.5 px-2.5 border-r border-[#3d9a42] text-center w-20">HSN CODE</th>
                          <th className="py-2.5 px-3 border-r border-[#3d9a42] text-right w-24">TAX VALUE</th>
                          <th className="py-2.5 px-2.5 border-r border-[#3d9a42] text-right w-20">C.GST</th>
                          <th className="py-2.5 px-2.5 border-r border-[#3d9a42] text-right w-20">SGST</th>
                          <th className="py-2.5 px-2.5 border-r border-[#3d9a42] text-right w-20">IGST</th>
                          <th className="py-2.5 px-2 border-r border-[#3d9a42] text-right w-16">R OFF</th>
                          <th className="py-2.5 px-3 border-r border-[#3d9a42] text-right w-28 bg-[#236527]">TOTAL VALUE</th>
                          <th className="py-2.5 px-2 border-r border-[#3d9a42] text-center w-16">RATE %</th>
                          <th className="py-2.5 px-3 text-left w-36">PARTY GSTIN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e2e8f0]">
                        {displayedPurchases.map((r, idx) => (
                          <tr
                            key={`purchase-${r.billNo}-${idx}`}
                            className="even:bg-[#f8fafc] odd:bg-white hover:bg-emerald-50/60 transition-colors"
                          >
                            <td className="py-2 px-3 text-center font-medium text-[#475569] border-r border-[#e2e8f0] whitespace-nowrap">
                              {r.date}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[#0f172a] border-r border-[#e2e8f0]">
                              {r.partyName}
                            </td>
                            <td className="py-2 px-2 text-center text-[#64748b] border-r border-[#e2e8f0]">
                              {r.qty ?? "—"}
                            </td>
                            <td className="py-2 px-2.5 text-center font-mono font-medium text-[#1e293b] border-r border-[#e2e8f0]">
                              {r.billNo}
                            </td>
                            <td className="py-2 px-2.5 text-center text-[#64748b] border-r border-[#e2e8f0]">
                              {r.hsnCode}
                            </td>
                            <td className="py-2 px-3 text-right font-medium text-[#0f172a] border-r border-[#e2e8f0]">
                              {formatInr(r.taxValue)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-[#475569] border-r border-[#e2e8f0]">
                              {formatInr(r.cgst)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-[#475569] border-r border-[#e2e8f0]">
                              {formatInr(r.sgst)}
                            </td>
                            <td className="py-2 px-2.5 text-right text-[#475569] border-r border-[#e2e8f0]">
                              {formatInr(r.igst)}
                            </td>
                            <td className="py-2 px-2 text-right text-[#94a3b8] border-r border-[#e2e8f0]">
                              {formatInr(r.roundOff)}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-[#0f172a] border-r border-[#e2e8f0] bg-slate-50/50">
                              {formatInr(r.totalValue)}
                            </td>
                            <td className="py-2 px-2 text-center text-[#64748b] border-r border-[#e2e8f0]">
                              {r.rate}%
                            </td>
                            <td className="py-2 px-3 font-mono text-[11px] text-[#475569] uppercase">
                              {r.partyGstin || "—"}
                            </td>
                          </tr>
                        ))}

                        {/* Red Totals Row matching Excel */}
                        <tr className="bg-[#C00000] text-white font-bold text-[11px] tracking-wide">
                          <td colSpan={2} className="py-2.5 px-3 text-center border-r border-[#df3a3a] uppercase">
                            TOTAL ({displayedPurchases.length} RECORDS)
                          </td>
                          <td className="py-2.5 px-2 border-r border-[#df3a3a] text-center">—</td>
                          <td className="py-2.5 px-2.5 border-r border-[#df3a3a] text-center">—</td>
                          <td className="py-2.5 px-2.5 border-r border-[#df3a3a] text-center">—</td>
                          <td className="py-2.5 px-3 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.purchaseTotals?.taxValue)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.purchaseTotals?.cgst)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.purchaseTotals?.sgst)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.purchaseTotals?.igst)}
                          </td>
                          <td className="py-2.5 px-2 text-right border-r border-[#df3a3a]">
                            {formatInr(listingData.purchaseTotals?.roundOff)}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-[#df3a3a] bg-[#9e0202]">
                            {formatInr(listingData.purchaseTotals?.totalValue)}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-[#df3a3a]">—</td>
                          <td className="py-2.5 px-3 text-left">—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick 1-Click Monthly Exports */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#0F766E]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#607089]">
            Quick 1-Click Monthly Exports ({MONTHS[now.getMonth()]} {now.getFullYear()})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              type: "COMBINED" as ReportType,
              title: "Sales + Purchase",
              desc: "1 Tab with 10 rows gap",
              color: "#0F766E",
              badge: "Complete Register",
            },
            {
              type: "B2C" as ReportType,
              title: "Sale B2C",
              desc: "Store Bills & Retail Orders",
              color: "#1A6E8E",
              badge: "Sales Only",
            },
            {
              type: "PURCHASE" as ReportType,
              title: "Purchase Register",
              desc: "Raw Material & Vendors",
              color: "#2E7D32",
              badge: "Purchase Only",
            },
          ].map((item) => {
            const isDownloading = directDownloadingType === item.type;
            return (
              <div
                key={item.type}
                className="flex flex-col justify-between rounded-xl border border-[#d7dce5] bg-white p-4 shadow-sm transition-all hover:border-[#a0b8d0] hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-white text-xs font-extrabold shadow-sm"
                      style={{ backgroundColor: item.color }}
                    >
                      {item.type === "COMBINED" ? "ALL" : item.type === "PURCHASE" ? "PUR" : item.type}
                    </span>
                    <span className="text-[10px] font-bold text-[#607089] bg-[#f1f5f9] px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#162237]">{item.title}</p>
                  <p className="text-xs text-[#718096] mt-0.5">{item.desc}</p>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-[#f1f5f9]">
                  <button
                    type="button"
                    onClick={() => {
                      setReportType(item.type);
                      setPeriod("monthly");
                      setSelectedMonth(now.getMonth());
                      setSelectedYear(now.getFullYear());
                    }}
                    className="flex-1 rounded-lg border border-[#d7dce5] bg-[#f8fafc] py-1.5 px-2 text-xs font-semibold text-[#4a5568] hover:bg-[#e2e8f0] transition-colors"
                  >
                    View Listing
                  </button>
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleQuickDownload(item.type)}
                    className="inline-flex items-center gap-1.5 rounded-lg py-1.5 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:opacity-95 disabled:opacity-50"
                    style={{ backgroundColor: item.color }}
                  >
                    {isDownloading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}