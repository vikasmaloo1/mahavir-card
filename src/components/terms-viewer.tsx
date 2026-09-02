"use client";

import { useState, useMemo } from "react";
import { ChevronDown, FileText, Printer, Search } from "lucide-react";

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
  { id: "ALL", labelEn: "All Terms", labelGu: "બધા નિયમો", labelHi: "सभी नियम" },
  { id: "LEGAL", labelEn: "Legal & B2B", labelGu: "કાનૂની અને B2B", labelHi: "कानूनी एवं B2B" },
  { id: "COLOR_QUALITY", labelEn: "Color & Quality", labelGu: "કલર અને ગુણવત્તા", labelHi: "कलर और गुणवत्ता" },
  { id: "DISPATCH_TRANSIT", labelEn: "Dispatch & Godown", labelGu: "ડિસ્પેચ અને ગોડાઉન", labelHi: "डिस्पैच और गोदाम" },
  { id: "ARTWORK", labelEn: "Artwork & CDR", labelGu: "આર્ટવર્ક અને CDR", labelHi: "આર્ટવર્ક और CDR" },
  { id: "GENERAL", labelEn: "General", labelGu: "સામાન્ય", labelHi: "सामान्य" },
];

const uiStrings = {
  en: {
    pageTitle: "Terms & Conditions",
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "Search terms...",
    printBtn: "Print",
    noResults: "No terms found matching your search.",
    resetFilter: "Reset filters",
    jurisdictionNote: "Ahmedabad, Gujarat Commercial Printing",
  },
  gu: {
    pageTitle: "નિયમો અને શરતો (Terms & Conditions)",
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "નિયમો શોધો...",
    printBtn: "પ્રિન્ટ",
    noResults: "કોઈ નિયમો મળ્યા નથી.",
    resetFilter: "રીસેટ કરો",
    jurisdictionNote: "અમદાવાદ, ગુજરાત કોમર્શિયલ પ્રિન્ટીંગ",
  },
  hi: {
    pageTitle: "नियम एवं शर्तें (Terms & Conditions)",
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "नियम खोजें...",
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

  function getContent(item: TermRecord): string {
    if (language === "gu" && item.contentGu?.trim()) return item.contentGu;
    if (language === "hi" && item.contentHi?.trim()) return item.contentHi;
    return item.content;
  }

  function renderFormattedContent(rawContent: string) {
    const prefixes = ["IMPORTANT : -", "મહત્વપૂર્ણ : -", "महत्वपूर्ण : -"];
    for (const prefix of prefixes) {
      if (rawContent.startsWith(prefix)) {
        return (
          <span>
            <span className="text-red-600 font-extrabold tracking-wide">{prefix} </span>
            <span className="text-slate-800 font-semibold">{rawContent.slice(prefix.length).trimStart()}</span>
          </span>
        );
      }
    }
    return <span className="text-slate-800 font-medium">{rawContent}</span>;
  }

  const filteredTerms = useMemo(() => {
    return terms.filter((item) => {
      if (selectedCategory !== "ALL" && item.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const content = (getContent(item) + " " + item.content).toLowerCase();
        const title = (item.title + " " + (item.titleGu || "") + " " + (item.titleHi || "")).toLowerCase();
        return content.includes(query) || title.includes(query);
      }
      return true;
    });
  }, [terms, selectedCategory, searchQuery, language]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Main Clean Document Card Container matching user reference */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-10 sm:py-12 shadow-sm">
        {/* Centered Page Heading */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight text-slate-800">
            {t.pageTitle}
          </h1>

          {/* Centered Language Selector matching user screenshot */}
          <div className="mt-5 flex items-center justify-center gap-2">
            <span className="text-xs sm:text-[13px] font-bold uppercase tracking-wider text-slate-700">
              {t.selectLanguage}
            </span>
            <div className="relative">
              <select
                id="terms-language-selector"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none rounded-md border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-semibold text-slate-800 shadow-xs outline-none transition hover:border-slate-400 focus:border-[#2457b8] focus:ring-1 focus:ring-[#2457b8] cursor-pointer"
              >
                <option value="en">English</option>
                <option value="gu">ગુજરાતી</option>
                <option value="hi">हिंदी</option>
              </select>
              <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Subtle Category Filter & Utility Bar */}
        <div className="mt-8 flex flex-col gap-3 border-y border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const label = language === "gu" ? cat.labelGu : language === "hi" ? cat.labelHi : cat.labelEn;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
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

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-48">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-md border border-slate-200 bg-slate-50/70 py-1 pl-8 pr-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Printer size={13} />
              {t.printBtn}
            </button>
          </div>
        </div>

        {/* Numbered Terms List with Large, Crisp Typography */}
        <div className="mt-8 space-y-6 sm:space-y-7">
          {filteredTerms.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center">
              <FileText size={28} className="mx-auto text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600">{t.noResults}</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs font-bold text-[#2457b8] hover:underline"
              >
                {t.resetFilter}
              </button>
            </div>
          ) : (
            filteredTerms.map((item, index) => {
              const content = getContent(item);
              const clauseNumber = item.sortOrder || index + 1;

              return (
                <div
                  key={item.id}
                  className="flex items-start gap-2.5 sm:gap-3.5 text-[15.5px] sm:text-[17px] leading-[1.75] sm:leading-[1.8] text-slate-800 pb-5 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  {/* Big Numbering */}
                  <span className="select-none font-bold text-slate-900 shrink-0 min-w-[20px] sm:min-w-[24px]">
                    {clauseNumber}.
                  </span>

                  {/* Body with Red IMPORTANT prefix & big crisp typography */}
                  <div className="flex-1">
                    {renderFormattedContent(content)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Jurisdiction & Legal Sign-off Footer */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 text-center text-xs sm:text-[13px] font-medium text-slate-500">
          <p>
            ⚖️ <span className="font-semibold text-slate-800">Mahavir Card</span> — {t.jurisdictionNote}. All the legal matters are subject to Ahmedabad Jurisdiction Only.
          </p>
        </div>
      </div>
    </div>
  );
}
