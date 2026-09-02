"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, FileText, Globe, Printer, Search, ShieldCheck } from "lucide-react";

export type TermRecord = {
  id: string;
  title: string;
  titleGu?: string | null;
  titleHi?: string | null;
  content: string;
  contentGu?: string | null;
  contentHi?: string | null;
  category: string;
  isImportant: boolean;
  sortOrder: number;
  createdAt?: Date | string | null;
};

type Language = "en" | "gu" | "hi";

const categories = [
  { id: "ALL", labelEn: "All Policies", labelGu: "બધા નિયમો", labelHi: "सभी नियम" },
  { id: "COLOR_QUALITY", labelEn: "Color & Quality", labelGu: "કલર અને ગુણવત્તા", labelHi: "कलर और गुणवत्ता" },
  { id: "DISPATCH_TRANSIT", labelEn: "Dispatch & Godown", labelGu: "ડિસ્પેચ અને ગોડાઉન", labelHi: "डिस्पैच और गोदाम" },
  { id: "LEGAL", labelEn: "Legal & Jurisdiction", labelGu: "કાનૂની ન્યાયક્ષેત્ર", labelHi: "कानूनी क्षेत्राधिकार" },
  { id: "ARTWORK", labelEn: "Artwork & CDR", labelGu: "આર્ટવર્ક અને CDR", labelHi: "आर्टवर्क और CDR" },
  { id: "GENERAL", labelEn: "General Guidelines", labelGu: "સામાન્ય માર્ગદર્શિકા", labelHi: "सामान्य दिशानिर्देश" },
];

const uiStrings = {
  en: {
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "Search terms, color matching, dispatch...",
    importantBadge: "IMPORTANT NOTICE",
    importantSubtitle: "Critical company policy & commercial print dispatch acceptance",
    allCategories: "All Policies",
    printBtn: "Print / Save PDF",
    noResults: "No terms found matching your query.",
    resetFilter: "Reset search & filters",
    jurisdictionNote: "Ahmedabad, Gujarat Commercial Printing",
    lastUpdated: "Effective Date: Commercial Print Season 2026",
  },
  gu: {
    selectLanguage: "ભાષા પસંદ કરો (SELECT LANGUAGE):",
    searchPlaceholder: "નિયમો, કલર મેચિંગ, ડિસ્પેચ શોધો...",
    importantBadge: "મહત્વપૂર્ણ સૂચના (IMPORTANT NOTICE)",
    importantSubtitle: "કંપનીની મહત્વપૂર્ણ પોલિસી અને કોમર્શિયલ પ્રિન્ટ ડિસ્પેચ શરત",
    allCategories: "બધા નિયમો",
    printBtn: "પ્રિન્ટ / PDF સેવ કરો",
    noResults: "કોઈ નિયમો મળ્યા નથી.",
    resetFilter: "ફિલ્ટર રીસેટ કરો",
    jurisdictionNote: "અમદાવાદ, ગુજરાત કોમર્શિયલ પ્રિન્ટીંગ",
    lastUpdated: "અમલીકરણ તારીખ: કોમર્શિયલ પ્રિન્ટ સીઝન ૨૦૨૬",
  },
  hi: {
    selectLanguage: "भाषा चुनें (SELECT LANGUAGE):",
    searchPlaceholder: "नियम, कलर मैचिंग, डिस्पैच खोजें...",
    importantBadge: "महत्वपूर्ण सूचना (IMPORTANT NOTICE)",
    importantSubtitle: "कंपनी की महत्वपूर्ण नीति एवं कमर्शियल प्रिंट डिस्पैच स्वीकृति",
    allCategories: "सभी नियम",
    printBtn: "प्रिंट / PDF सेव करें",
    noResults: "कोई नियम नहीं मिला।",
    resetFilter: "फ़िल्टर रीसेट करें",
    jurisdictionNote: "अहमदाबाद, गुजरात कमर्शियल प्रिंटिंग",
    lastUpdated: "प्रभावी तिथि: कमर्शियल प्रिंट सीजन 2026",
  },
};

export function TermsViewer({ terms }: { terms: TermRecord[] }) {
  const [language, setLanguage] = useState<Language>("en");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const t = uiStrings[language];

  function getTitle(item: TermRecord): string {
    if (language === "gu" && item.titleGu?.trim()) return item.titleGu;
    if (language === "hi" && item.titleHi?.trim()) return item.titleHi;
    return item.title;
  }

  function getContent(item: TermRecord): string {
    if (language === "gu" && item.contentGu?.trim()) return item.contentGu;
    if (language === "hi" && item.contentHi?.trim()) return item.contentHi;
    return item.content;
  }

  function getCategoryLabel(catId: string): string {
    const found = categories.find((c) => c.id === catId);
    if (!found) return catId;
    if (language === "gu") return found.labelGu;
    if (language === "hi") return found.labelHi;
    return found.labelEn;
  }

  const filteredTerms = useMemo(() => {
    return terms.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const title = (getTitle(item) + " " + item.title).toLowerCase();
        const content = (getContent(item) + " " + item.content).toLowerCase();
        return title.includes(query) || content.includes(query);
      }
      return true;
    });
  }, [terms, selectedCategory, searchQuery, language]);

  return (
    <div className="space-y-8">
      {/* Top Bar with Language Selector and Actions */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#d7dce5] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        {/* Language Selector Dropdown matching User UI */}
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="language-selector" className="text-xs font-bold uppercase tracking-[0.14em] text-[#334155] sm:text-sm">
            {t.selectLanguage}
          </label>
          <div className="relative">
            <select
              id="language-selector"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="appearance-none rounded-lg border border-[#cbd5e1] bg-[#f8fafc] py-2 pl-3.5 pr-9 text-sm font-bold text-[#0f172a] shadow-xs outline-none transition-all hover:border-[#2457b8] focus:border-[#2457b8] focus:ring-2 focus:ring-[#2457b8]/20 cursor-pointer"
            >
              <option value="en">English</option>
              <option value="gu">ગુજરાતી (Gujarati)</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
          </div>
        </div>

        {/* Print / Export Action & Notice */}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[#64748b] lg:inline">{t.lastUpdated}</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-[#d1d5db] bg-white px-3.5 py-2 text-xs font-semibold text-[#374151] hover:bg-[#f9fafb] hover:text-[#111827] shadow-xs transition-colors"
          >
            <Printer size={15} />
            {t.printBtn}
          </button>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const label = language === "gu" ? cat.labelGu : language === "hi" ? cat.labelHi : cat.labelEn;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#1e3a8a] text-white shadow-sm"
                    : "border border-[#e2e8f0] bg-white text-[#475569] hover:border-[#cbd5e1] hover:text-[#0f172a]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div className="relative min-w-[240px] sm:w-72">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full rounded-full border border-[#cbd5e1] bg-white py-2 pl-9 pr-4 text-xs font-medium text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#2457b8] focus:ring-2 focus:ring-[#2457b8]/20"
          />
        </div>
      </div>

      {/* Terms List */}
      <div className="space-y-5">
        {filteredTerms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-white p-12 text-center">
            <FileText size={32} className="mx-auto text-[#94a3b8]" />
            <p className="mt-3 text-sm font-semibold text-[#1e293b]">{t.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("ALL");
                setSearchQuery("");
              }}
              className="mt-3 text-xs font-bold text-[#2457b8] underline hover:text-[#1d4ed8]"
            >
              {t.resetFilter}
            </button>
          </div>
        ) : (
          filteredTerms.map((item, index) => {
            const title = getTitle(item);
            const content = getContent(item);
            const catLabel = getCategoryLabel(item.category);

            // Special highlighted visual effect for important clauses
            if (item.isImportant) {
              return (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border-2 border-[#ef4444] bg-gradient-to-br from-[#fef2f2] via-[#fff5f5] to-[#fee2e2] p-5 sm:p-6 shadow-md shadow-red-100/60 ring-4 ring-red-400/20 transition-all hover:shadow-lg hover:shadow-red-200/50"
                >
                  {/* Subtle animated red glow pulse overlay */}
                  <div className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-red-400/10 blur-2xl animate-pulse" />
                  
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-red-200/80">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#dc2626] px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-xs animate-pulse">
                          <AlertTriangle size={13} className="shrink-0" />
                          {t.importantBadge}
                        </span>
                        <span className="rounded-md bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#991b1b] border border-red-200">
                          {catLabel}
                        </span>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#b91c1c]">
                        Clause #{item.sortOrder || index + 1}
                      </span>
                    </div>

                    <h3 className="mt-3.5 text-lg sm:text-xl font-black text-[#991b1b] tracking-tight">
                      {title}
                    </h3>

                    {/* Highly prominent red content with visual styling */}
                    <div className="mt-3 rounded-xl border border-red-300/80 bg-white/95 p-4 sm:p-5 shadow-xs">
                      <p className="text-[15px] sm:text-[17px] font-bold leading-relaxed text-[#b91c1c] tracking-normal">
                        {content}
                      </p>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-[#dc2626]">
                      {t.importantSubtitle}
                    </p>
                  </div>
                </div>
              );
            }

            // Standard Term Card
            return (
              <div
                key={item.id}
                className="rounded-xl border border-[#e2e8f0] bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-[#cbd5e1] hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-md bg-[#f1f5f9] px-2.5 py-0.5 text-[11px] font-bold text-[#475569] uppercase tracking-wide">
                    {catLabel}
                  </span>
                  <span className="text-xs font-semibold text-[#94a3b8]">
                    #{item.sortOrder || index + 1}
                  </span>
                </div>

                <h3 className="mt-2.5 text-base sm:text-lg font-bold text-[#0f172a]">
                  {title}
                </h3>

                <p className="mt-2.5 text-sm sm:text-[15px] leading-relaxed text-[#334155]">
                  {content}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Legal Jurisdiction Notice */}
      <div className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4 text-center text-xs sm:text-sm font-semibold text-[#475569]">
        <p>
          ⚖️ <span className="font-bold text-[#0f172a]">Mahavir Card / Printers Club of India Limited</span> — {t.jurisdictionNote}. All legal matters are subject to Ahmedabad Jurisdiction Only.
        </p>
      </div>
    </div>
  );
}
