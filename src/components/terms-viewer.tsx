"use client";

import { useState, useMemo } from "react";
import { AlertCircle, ChevronDown, FileText, Printer, Search } from "lucide-react";

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
  { id: "ARTWORK", labelEn: "Artwork & CDR", labelGu: "આર્ટવર્ક અને CDR", labelHi: "આર્ટવર્ક और CDR" },
  { id: "GENERAL", labelEn: "General", labelGu: "સામાન્ય", labelHi: "सामान्य" },
];

const uiStrings = {
  en: {
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "Search terms...",
    importantBadge: "Important Notice",
    allCategories: "All Policies",
    printBtn: "Print",
    noResults: "No terms found matching your search.",
    resetFilter: "Reset filters",
    jurisdictionNote: "Ahmedabad, Gujarat Commercial Printing",
  },
  gu: {
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "નિયમો શોધો...",
    importantBadge: "મહત્વપૂર્ણ સૂચના",
    allCategories: "બધા નિયમો",
    printBtn: "પ્રિન્ટ",
    noResults: "કોઈ નિયમો મળ્યા નથી.",
    resetFilter: "રીસેટ કરો",
    jurisdictionNote: "અમદાવાદ, ગુજરાત કોમર્શિયલ પ્રિન્ટીંગ",
  },
  hi: {
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "नियम खोजें...",
    importantBadge: "महत्वपूर्ण सूचना",
    allCategories: "सभी नियम",
    printBtn: "प्रिंट",
    noResults: "कोई नियम नहीं मिला।",
    resetFilter: "रीसेट करें",
    jurisdictionNote: "अहमदाबाद, गुजरात कमर्शियल प्रिंटिंग",
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
    <div className="space-y-6">
      {/* Subtle Controls Bar */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Language Selector Dropdown matching User UI */}
        <div className="flex items-center gap-2.5">
          <label htmlFor="language-selector" className="text-xs font-semibold tracking-wide text-slate-700">
            {t.selectLanguage}
          </label>
          <div className="relative">
            <select
              id="language-selector"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="appearance-none rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold text-slate-900 shadow-xs outline-none transition hover:border-slate-400 focus:border-[#2457b8] focus:ring-1 focus:ring-[#2457b8] cursor-pointer"
            >
              <option value="en">English</option>
              <option value="gu">ગુજરાતી</option>
              <option value="hi">हिंदी</option>
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {/* Search Field & Print Action */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:w-60">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full rounded-md border border-slate-200 bg-slate-50/60 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white"
            />
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Printer size={13} />
            {t.printBtn}
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const label = language === "gu" ? cat.labelGu : language === "hi" ? cat.labelHi : cat.labelEn;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Terms List */}
      <div className="space-y-4">
        {filteredTerms.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-white p-8 text-center">
            <FileText size={24} className="mx-auto text-slate-400" />
            <p className="mt-2 text-xs font-medium text-slate-600">{t.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory("ALL");
                setSearchQuery("");
              }}
              className="mt-2 text-xs font-semibold text-[#2457b8] hover:underline"
            >
              {t.resetFilter}
            </button>
          </div>
        ) : (
          filteredTerms.map((item, index) => {
            const title = getTitle(item);
            const content = getContent(item);
            const catLabel = getCategoryLabel(item.category);

            // Subtle red highlight for important clause
            if (item.isImportant) {
              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-red-200/90 border-l-[3px] border-l-red-600 bg-red-50/20 p-4 sm:p-5 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 border border-red-200/80">
                        <AlertCircle size={12} className="shrink-0 text-red-600" />
                        {t.importantBadge}
                      </span>
                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {catLabel}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      #{item.sortOrder || index + 1}
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-base font-semibold text-slate-900">
                    {title}
                  </h2>

                  <div className="mt-2 rounded-md border border-red-100 bg-white p-3 text-sm leading-relaxed text-red-900 font-medium">
                    {content}
                  </div>
                </article>
              );
            }

            // Standard Term Card - subtle & clean
            return (
              <article
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5 shadow-xs transition-colors hover:border-slate-300"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    {catLabel}
                  </span>
                  <span className="text-xs text-slate-400">
                    #{item.sortOrder || index + 1}
                  </span>
                </div>

                <h2 className="mt-2 text-base font-semibold text-slate-900">
                  {title}
                </h2>

                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {content}
                </p>
              </article>
            );
          })
        )}
      </div>

      {/* Subtle Jurisdiction Footer */}
      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-center text-xs text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">Mahavir Card</span> — {t.jurisdictionNote}. All legal matters are subject to Ahmedabad Jurisdiction Only.
        </p>
      </div>
    </div>
  );
}
