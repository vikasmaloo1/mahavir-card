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
  { id: "COLOR_QUALITY", labelEn: "Color & Quality", labelGu: "કલર અને ગુણવત્તા", labelHi: "कलर और गुणवत्ता" },
  { id: "DISPATCH_TRANSIT", labelEn: "Dispatch & Godown", labelGu: "ડિસ્પેચ અને ગોડાઉન", labelHi: "डिस्पैच और गोदाम" },
  { id: "LEGAL", labelEn: "Legal & Liability", labelGu: "કાનૂની અને જવાબદારી", labelHi: "कानूनी एवं दायित्व" },
  { id: "ARTWORK", labelEn: "Artwork & CDR", labelGu: "આર્ટવર્ક અને CDR", labelHi: "આર્ટવર્ક और CDR" },
  { id: "GENERAL", labelEn: "General Policies", labelGu: "સામાન્ય નીતિઓ", labelHi: "सामान्य नीतियां" },
];

const uiStrings = {
  en: {
    pageTitle: "Terms & Conditions",
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "Search terms...",
    printBtn: "Print Terms",
    noResults: "No terms found matching your search.",
    resetFilter: "Reset filters",
    jurisdictionNote: "Ahmedabad, Gujarat Commercial Printing",
  },
  gu: {
    pageTitle: "નિયમો અને શરતો (Terms & Conditions)",
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "નિયમો શોધો...",
    printBtn: "પ્રિન્ટ કરો",
    noResults: "કોઈ નિયમો મળ્યા નથી.",
    resetFilter: "રીસેટ કરો",
    jurisdictionNote: "અમદાવાદ, ગુજરાત કોમર્શિયલ પ્રિન્ટીંગ",
  },
  hi: {
    pageTitle: "नियम एवं शर्तें (Terms & Conditions)",
    selectLanguage: "SELECT LANGUAGE:",
    searchPlaceholder: "नियम खोजें...",
    printBtn: "प्रिंट करें",
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
    const prefixes = [
      "IMPORTANT : -",
      "IMPORTANT :-",
      "IMPORTANT:",
      "મહત્વપૂર્ણ : -",
      "મહત્વપૂર્ણ :-",
      "મહત્વપૂર્ણ:",
      "महत्वपूर्ण : -",
      "महत्वपूर्ण :-",
      "महत्वपूर्ण:",
    ];

    for (const prefix of prefixes) {
      if (rawContent.startsWith(prefix)) {
        return (
          <span>
            <span className="text-red-600 font-black tracking-wide mr-1.5">{prefix}</span>
            <span className="text-slate-900 font-bold">{rawContent.slice(prefix.length).trimStart()}</span>
          </span>
        );
      }
    }
    return <span className="text-slate-900 font-semibold">{rawContent}</span>;
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
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Centered Master Document Card */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-12 lg:p-16 shadow-md">
        {/* Main Document Title */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-slate-900">
            {t.pageTitle}
          </h1>

          {/* Centered Language Selector matching user screenshot */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-slate-700">
              {t.selectLanguage}
            </span>
            <div className="relative">
              <select
                id="terms-language-selector"
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="appearance-none rounded-lg border-2 border-slate-300 bg-white py-2 pl-4 pr-10 text-base sm:text-lg font-bold text-slate-900 shadow-xs outline-none transition hover:border-slate-500 focus:border-[#2457b8] focus:ring-2 focus:ring-[#2457b8]/20 cursor-pointer"
              >
                <option value="en">English</option>
                <option value="gu">ગુજરાતી (Gujarati)</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
              <ChevronDown size={18} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-600" />
            </div>
          </div>
        </div>

        {/* Filter Pills & Search Utility Bar */}
        <div className="mt-8 flex flex-col gap-3.5 border-y border-slate-200 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const label = language === "gu" ? cat.labelGu : language === "hi" ? cat.labelHi : cat.labelEn;
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-bold transition-colors ${
                    active
                      ? "bg-slate-900 text-white shadow-xs"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/80 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-400 focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Printer size={15} />
              {t.printBtn}
            </button>
          </div>
        </div>

        {/* Numbered Terms List with PROMINENT, BIG FONTS */}
        <div className="mt-10 space-y-8 sm:space-y-10">
          {filteredTerms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center">
              <FileText size={36} className="mx-auto text-slate-400" />
              <p className="mt-3 text-base font-semibold text-slate-700">{t.noResults}</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                }}
                className="mt-3 text-sm font-bold text-[#2457b8] hover:underline"
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
                  className="flex items-start gap-3 sm:gap-4 text-[17px] sm:text-[19px] lg:text-[21px] leading-[1.75] sm:leading-[1.8] text-slate-900 pb-7 sm:pb-8 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  {/* Big Numbering */}
                  <span className="select-none font-black text-slate-900 shrink-0 min-w-[28px] sm:min-w-[34px]">
                    {clauseNumber}.
                  </span>

                  {/* Body Text with Big Font and Vibrant Red Prefix */}
                  <div className="flex-1">
                    {renderFormattedContent(content)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Legal Sign-off & Jurisdiction Footer */}
        <div className="mt-12 pt-8 border-t-2 border-slate-200 text-center text-sm sm:text-base font-semibold text-slate-600">
          <p>
            ⚖️ <span className="font-extrabold text-slate-900">Mahavir Card</span> — {t.jurisdictionNote}. All the legal matters are subject to Ahmedabad Jurisdiction Only.
          </p>
        </div>
      </div>
    </div>
  );
}
