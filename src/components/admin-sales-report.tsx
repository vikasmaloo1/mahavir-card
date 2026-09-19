"use client";

import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

type ReportType = "B2C" | "B2B" | "PURCHASE";
type Period = "daily" | "weekly" | "monthly" | "custom";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function pad(n: number) { return String(n).padStart(2, "0"); }

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

export function AdminSalesReport() {
  const now = new Date();
  const [reportType, setReportType] = useState<ReportType>("B2C");
  const [period, setPeriod] = useState<Period>("monthly");
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [weekDate, setWeekDate] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [downloading, setDownloading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const getParams = (): { dateFrom: string; dateTo: string } => {
    if (period === "daily") return { dateFrom: selectedDay, dateTo: selectedDay };
    if (period === "weekly") return getWeekRange(weekDate);
    if (period === "monthly") return getMonthRange(selectedYear, selectedMonth);
    return { dateFrom: customFrom, dateTo: customTo };
  };

  const handleDownload = async () => {
    const { dateFrom, dateTo } = getParams();
    if (!dateFrom) { alert("Please select a date range"); return; }
    setDownloading(true);
    try {
      const url = `/api/admin/reports/sales-excel?type=${reportType}&period=${period}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
      const res = await fetch(url);
      if (!res.ok) { alert("Failed to generate report"); return; }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${reportType}_Report_${dateFrom}_${dateTo}.xlsx`;
      a.click();
    } finally { setDownloading(false); }
  };

  const tabCls = (t: ReportType) =>
    `flex-1 py-2.5 text-sm font-semibold transition-colors rounded-lg ${reportType === t ? "bg-[#1A6E8E] text-white shadow-sm" : "text-[#607089] hover:bg-[#f0f4f8]"}`;

  const periodCls = (p: Period) =>
    `px-4 py-2 text-sm font-semibold rounded-full transition-colors ${period === p ? "bg-[#1A6E8E] text-white" : "bg-[#f5f7fa] text-[#607089] hover:bg-[#e8ecf1]"}`;

  const { dateFrom, dateTo } = getParams();
  const rangeLabel = dateFrom && dateTo ? `${new Date(dateFrom).toLocaleDateString("en-IN")} — ${new Date(dateTo).toLocaleDateString("en-IN")}` : "—";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#162237]">Sales Report</h1>
        <p className="mt-0.5 text-sm text-[#607089]">Download Excel reports for B2C sales, B2B sales, or purchase register</p>
      </div>

      <div className="rounded-xl border border-[#d7dce5] bg-white p-6 space-y-6">
        {/* Report Type Tabs */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#607089]">Report Type</p>
          <div className="flex gap-2 rounded-xl bg-[#f5f7fa] p-1">
            {(["B2C", "B2B", "PURCHASE"] as ReportType[]).map((t) => (
              <button key={t} onClick={() => setReportType(t)} className={tabCls(t)}>
                {t === "B2C" ? "Sale B2C" : t === "B2B" ? "Sale B2B" : "Purchase"}
              </button>
            ))}
          </div>
        </div>

        {/* Period */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#607089]">Period</p>
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly", "custom"] as Period[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={periodCls(p)}>
                {p === "daily" ? "Daily" : p === "weekly" ? "Weekly" : p === "monthly" ? "Monthly" : "Custom Range"}
              </button>
            ))}
          </div>
        </div>

        {/* Period Controls */}
        {period === "daily" && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#607089]">Select Date</p>
            <input type="date" value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}
              className="rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm focus:border-[#1A6E8E] focus:outline-none" />
          </div>
        )}

        {period === "weekly" && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[#607089]">Select any date in the week</p>
            <input type="date" value={weekDate} onChange={(e) => setWeekDate(e.target.value)}
              className="rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm focus:border-[#1A6E8E] focus:outline-none" />
            {weekDate && <p className="mt-1 text-xs text-[#607089]">Week: {getWeekRange(weekDate).dateFrom} to {getWeekRange(weekDate).dateTo}</p>}
          </div>
        )}

        {period === "monthly" && (
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#607089]">Month</p>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm focus:border-[#1A6E8E] focus:outline-none">
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#607089]">Year</p>
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm focus:border-[#1A6E8E] focus:outline-none">
                {years.map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
        )}

        {period === "custom" && (
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#607089]">From</p>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm focus:border-[#1A6E8E] focus:outline-none" />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-[#607089]">To</p>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-[#d7dce5] bg-[#f9fafb] px-3 py-2 text-sm focus:border-[#1A6E8E] focus:outline-none" />
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="rounded-lg bg-[#f0f8fb] border border-[#cce4ef] p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1A6E8E]">
              {reportType === "B2C" ? "Sale B2C" : reportType === "B2B" ? "Sale B2B" : "Purchase Register"}
            </p>
            <p className="mt-0.5 text-sm text-[#607089]">{rangeLabel}</p>
          </div>
          <FileSpreadsheet size={28} className="text-[#1A6E8E] shrink-0" />
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#1A6E8E] py-3 text-sm font-bold text-white hover:bg-[#155a76] disabled:opacity-60 transition-colors"
        >
          <Download size={16} />
          {downloading ? "Generating Excel…" : "Download Excel Report"}
        </button>
      </div>

      {/* Quick access cards */}
      <div className="grid grid-cols-3 gap-3">
        {([["B2C","Sale B2C","This Month","#1A6E8E"],["B2B","Sale B2B","This Month","#7B3F8D"],["PURCHASE","Purchase","This Month","#2E7D32"]] as [ReportType, string, string, string][]).map(([type, label, sub, color]) => (
          <button key={type} onClick={() => { setReportType(type); setPeriod("monthly"); setSelectedMonth(now.getMonth()); setSelectedYear(now.getFullYear()); }}
            className="rounded-xl border border-[#d7dce5] bg-white p-3 text-left hover:border-[#a0b8d0] hover:shadow-sm transition-all">
            <div className="mb-1 w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: color }}>{type[0]}</div>
            <p className="text-xs font-bold text-[#162237]">{label}</p>
            <p className="text-xs text-[#607089]">{sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}