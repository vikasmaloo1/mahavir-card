"use client";

import { useState } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Download, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";

type ReportType = "B2C" | "B2B" | "PURCHASE";
type Period = "daily" | "weekly" | "monthly" | "custom";

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
  const [directDownloadingType, setDirectDownloadingType] = useState<string | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  const getParams = (): { dateFrom: string; dateTo: string } => {
    if (period === "daily") return { dateFrom: selectedDay, dateTo: selectedDay };
    if (period === "weekly") return getWeekRange(weekDate);
    if (period === "monthly") return getMonthRange(selectedYear, selectedMonth);
    return { dateFrom: customFrom, dateTo: customTo };
  };

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
    const { dateFrom, dateTo } = getParams();
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

  const { dateFrom, dateTo } = getParams();
  const rangeLabel = dateFrom && dateTo
    ? `${new Date(dateFrom).toLocaleDateString("en-IN")} — ${new Date(dateTo).toLocaleDateString("en-IN")}`
    : "Select date range";

  const themeColors = {
    B2C: { bg: "#1A6E8E", hover: "#155a76", light: "#f0f8fb", border: "#cce4ef" },
    B2B: { bg: "#7B3F8D", hover: "#6a3479", light: "#faf5fb", border: "#eedbf2" },
    PURCHASE: { bg: "#2E7D32", hover: "#236527", light: "#f1f8f3", border: "#d0e9d4" },
  };

  const activeTheme = themeColors[reportType];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#162237]">Sales & Purchase Excel Reports</h1>
        <p className="mt-1 text-sm text-[#607089]">
          Export official GST & accounting register format (.xlsx) with daily, weekly, or monthly filters
        </p>
      </div>

      {/* Main Configuration Card */}
      <div className="rounded-2xl border border-[#d7dce5] bg-white p-6 shadow-sm space-y-6">
        {/* Step 1: Report Type Tabs */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#607089]">
            1. Select Report Category
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              {
                id: "B2C" as ReportType,
                title: "Sale B2C",
                subtitle: "Store Bills + Retail Orders",
                color: "#1A6E8E",
              },
              {
                id: "B2B" as ReportType,
                title: "Sale B2B",
                subtitle: "Registered GST Corporate",
                color: "#7B3F8D",
              },
              {
                id: "PURCHASE" as ReportType,
                title: "Purchase",
                subtitle: "Raw Material & Vendors",
                color: "#2E7D32",
              },
            ].map((t) => {
              const isActive = reportType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setReportType(t.id)}
                  className={`flex flex-col items-start rounded-xl border-2 p-3.5 text-left transition-all ${
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
                    {isActive && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                  <span className={`text-xs mt-0.5 ${isActive ? "text-white/80" : "text-[#718096]"}`}>
                    {t.subtitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Period Filter Selector */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#607089]">
            2. Choose Time Period
          </label>
          <div className="flex flex-wrap gap-2">
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
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all border ${
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

        {/* Step 3: Date Controls */}
        <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-4">
          {period === "monthly" && (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#607089]">Month</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3.5 py-2 text-sm font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#607089]">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3.5 py-2 text-sm font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-5 text-xs text-[#718096]">
                Exports complete calendar month from 1st to 30th/31st
              </div>
            </div>
          )}

          {period === "weekly" && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#607089]">
                Select any date in target week
              </label>
              <input
                type="date"
                value={weekDate}
                onChange={(e) => setWeekDate(e.target.value)}
                className="rounded-lg border border-[#d7dce5] bg-white px-3.5 py-2 text-sm font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
              />
              {weekDate && (
                <p className="text-xs font-semibold text-[#162237]">
                  Target Week: {getWeekRange(weekDate).dateFrom} to {getWeekRange(weekDate).dateTo} (Monday to Sunday)
                </p>
              )}
            </div>
          )}

          {period === "daily" && (
            <div>
              <label className="mb-1 block text-xs font-bold text-[#607089]">Select Specific Date</label>
              <input
                type="date"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="rounded-lg border border-[#d7dce5] bg-white px-3.5 py-2 text-sm font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
              />
            </div>
          )}

          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#607089]">From Date</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3.5 py-2 text-sm font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#607089]">To Date</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-lg border border-[#d7dce5] bg-white px-3.5 py-2 text-sm font-medium text-[#162237] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#162237]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 4: Summary Card */}
        <div
          className="rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          style={{ backgroundColor: activeTheme.light, borderColor: activeTheme.border }}
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} style={{ color: activeTheme.bg }} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: activeTheme.bg }}>
                {reportType === "B2C" ? "SALE B2C REGISTER" : reportType === "B2B" ? "SALE B2B REGISTER" : "PURCHASE REGISTER"}
              </p>
            </div>
            <p className="text-sm font-semibold text-[#162237]">{rangeLabel}</p>
            <p className="text-xs text-[#607089]">
              {reportType === "B2C"
                ? "Includes ALL manual store counter bills + online retail orders"
                : reportType === "B2B"
                ? "Includes corporate registered GST trade orders"
                : "Includes all logged raw material & paper purchases"}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-bold shadow-sm" style={{ color: activeTheme.bg }}>
            .XLSX FORMAT
          </span>
        </div>

        {/* Primary Download Button */}
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl py-3.5 px-6 text-sm font-bold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-60"
          style={{ backgroundColor: activeTheme.bg }}
        >
          {downloading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating Excel Sheet…
            </>
          ) : (
            <>
              <Download size={18} />
              Download {reportType === "B2C" ? "Sale B2C" : reportType === "B2B" ? "Sale B2B" : "Purchase"} Excel Report
            </>
          )}
        </button>
      </div>

      {/* Quick 1-Click Monthly Exports (Replacing the broken capsule buttons) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[#2457b8]" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#607089]">
            Quick 1-Click Exports (Current Month: {MONTHS[now.getMonth()]} {now.getFullYear()})
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              type: "B2C" as ReportType,
              title: "Sale B2C",
              desc: "Store Bills & Retail Orders",
              color: "#1A6E8E",
            },
            {
              type: "B2B" as ReportType,
              title: "Sale B2B",
              desc: "GST Trade Orders",
              color: "#7B3F8D",
            },
            {
              type: "PURCHASE" as ReportType,
              title: "Purchase",
              desc: "Vendor Purchase Register",
              color: "#2E7D32",
            },
          ].map((item) => {
            const isDownloading = directDownloadingType === item.type;
            return (
              <div
                key={item.type}
                className="flex flex-col justify-between rounded-xl border border-[#d7dce5] bg-white p-4 shadow-sm transition-all hover:border-[#a0b8d0] hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.type === "PURCHASE" ? "PUR" : item.type}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#162237]">{item.title}</p>
                    <p className="text-xs text-[#718096] truncate">{item.desc}</p>
                  </div>
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
                    Select
                  </button>
                  <button
                    type="button"
                    disabled={isDownloading}
                    onClick={() => handleQuickDownload(item.type)}
                    className="inline-flex items-center gap-1 rounded-lg py-1.5 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:opacity-95 disabled:opacity-50"
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