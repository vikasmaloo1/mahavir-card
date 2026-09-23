"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  BookOpen,
  Calendar,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
} from "lucide-react";

export type CatalogProductItem = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  shortDescription?: string;
  productionTime?: string;
  referenceQuantity?: number;
  referenceWeight?: number;
  ruleType: "FIXED_PER_REFERENCE_QUANTITY" | "FIXED" | "PER_SQ_INCH";
  amount?: number;
  ratePerSqInch?: number;
  rateUnit?: "RUPEES" | "PAISE";
  b2bAmount?: number;
  b2bRatePerSqInch?: number;
  size?: string;
  imageUrl?: string;
  addon?: {
    code: string;
    name: string;
    amount: number;
    referenceQuantity?: number;
  };
  bladeCharge?: number;
  minimumArea?: number;
  minimumCharge?: number;
  delivery?: {
    GJ: number;
    RJ: number;
  };
};

export type CatalogCategoryGroup = {
  slug: string;
  name: string;
  description: string;
  products: CatalogProductItem[];
};

export type BusinessInfo = {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  gstin: string;
  stateCode: string;
};

interface AdminPriceCatalogDocumentProps {
  categories: CatalogCategoryGroup[];
  businessInfo?: Partial<BusinessInfo>;
  generatedDate?: string;
}

const defaultBusinessInfo: BusinessInfo = {
  name: "MAHAVIR CARD",
  tagline: "ALL PRINTING SOLUTIONS & PAPER CUTTING",
  address: "Khadia Golwad, Opp. Jain Digamber Mandir",
  city: "Ahmedabad",
  state: "Gujarat",
  postalCode: "380001",
  phone: "+91 79847 52154 / +91 94263 71150",
  email: "mahavircard2011@gmail.com",
  website: "www.mahavircard.in",
  gstin: "24AIUPJ2271L1ZV",
  stateCode: "24 (Gujarat)",
};

function getAddonNote(p: CatalogProductItem): string | null {
  const notes: string[] = [];
  if (p.addon) {
    notes.push(`${p.addon.name}: +₹${p.addon.amount}`);
  }
  if (p.bladeCharge) {
    notes.push(`Half Blade: ₹${p.bladeCharge} / blade`);
  }
  if (p.minimumCharge) {
    notes.push(`Min. Charge: ₹${p.minimumCharge}`);
  }
  if (p.minimumArea) {
    notes.push(`Min. Area: ${p.minimumArea} sq.in`);
  }
  if (notes.length === 0) return null;
  return `(${notes.join(" · ")})`;
}

function getCategoryBaseQuantity(products: CatalogProductItem[]): number {
  const counts = new Map<number, number>();
  for (const p of products) {
    const q = p.referenceQuantity || 1000;
    counts.set(q, (counts.get(q) || 0) + 1);
  }
  let maxQty = 1000;
  let maxCount = 0;
  for (const [qty, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      maxQty = qty;
    }
  }
  return maxQty;
}

export function AdminPriceCatalogDocument({
  categories,
  businessInfo: propBusiness,
  generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
}: AdminPriceCatalogDocumentProps) {
  const business = { ...defaultBusinessInfo, ...propBusiness };

  const [priceMode, setPriceMode] = useState<"BOTH" | "RETAIL" | "B2B" | "RANGE">("BOTH");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showQuotable, setShowQuotable] = useState<boolean>(true);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === "ALL") return categories;
    return categories.filter((c) => c.slug === selectedCategory);
  }, [categories, selectedCategory]);

  const totalActiveProducts = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.products.length, 0);
  }, [categories]);

  const isB2BMode = priceMode === "B2B";

  return (
    <div className="min-h-screen bg-[#eceff3] text-[#1a202c] font-sans print:bg-white print:p-0 print:m-0">
      {/* SCREEN-ONLY TOOLBAR */}
      <div className="no-print sticky top-0 z-30 border-b border-[#cbd5e1] bg-white/95 backdrop-blur shadow-sm px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/products"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#475569] hover:text-[#0f223d] border border-[#cbd5e1] px-2.5 py-1.5 rounded bg-[#f8fafc] hover:bg-[#f1f5f9]"
            >
              <ArrowLeft size={14} /> Back to Products
            </Link>
            <Link
              href="/catalog"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#c59b27] hover:text-[#0f223d] border border-[#ecd9b5] px-2.5 py-1.5 rounded bg-[#fcf6ea] hover:bg-[#f8eed8]"
              title="Open public client-ready catalogue"
            >
              <BookOpen size={14} /> Client Catalogue (Public)
            </Link>
            <div className="h-4 w-px bg-[#cbd5e1] hidden sm:block" />
            <div>
              <h1 className="text-sm font-bold text-[#0f223d] leading-tight">
                Official Price Catalogue & Specification Directory
              </h1>
              <p className="text-[11px] text-[#64748b]">
                {totalActiveProducts} Active Products across {categories.length} Categories · Generated {generatedDate}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Price Mode Selector */}
            <div className="flex items-center rounded border border-[#cbd5e1] bg-[#f8fafc] p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setPriceMode("RANGE")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  priceMode === "RANGE"
                    ? "bg-[#0f223d] text-white font-bold"
                    : "text-[#475569] hover:text-black"
                }`}
              >
                Price Ranges
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("BOTH")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  priceMode === "BOTH"
                    ? "bg-[#0f223d] text-white font-bold"
                    : "text-[#475569] hover:text-black"
                }`}
              >
                Retail & Trade
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("RETAIL")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  priceMode === "RETAIL"
                    ? "bg-[#0f223d] text-white font-bold"
                    : "text-[#475569] hover:text-black"
                }`}
              >
                Retail Only
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("B2B")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  priceMode === "B2B"
                    ? "bg-[#0f223d] text-white font-bold"
                    : "text-[#475569] hover:text-black"
                }`}
              >
                B2B Trade Only
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border border-[#cbd5e1] rounded px-2.5 py-1.5 bg-white text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#0f223d]"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name} ({cat.products.length})
                </option>
              ))}
            </select>

            {/* Toggle Quotable Section */}
            <label className="inline-flex items-center gap-1.5 text-xs text-[#334155] font-medium cursor-pointer border border-[#cbd5e1] rounded px-2 py-1.5 bg-[#f8fafc]">
              <input
                type="checkbox"
                checked={showQuotable}
                onChange={(e) => setShowQuotable(e.target.checked)}
                className="rounded border-[#cbd5e1] text-[#0f223d] focus:ring-0"
              />
              Quotable Services
            </label>

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-[#0f223d] text-white hover:bg-[#1a3861] px-4 py-1.5 rounded text-xs font-bold shadow-sm transition-all"
            >
              <Printer size={15} /> Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* PRINT STYLES: HIDE EVERYTHING EXCEPT THE DOCUMENT */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 12mm 12mm;
          }
          body,
          html {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 11px !important;
          }
          header:not(.print-table-header),
          nav,
          aside,
          .no-print {
            display: none !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* MAIN DOCUMENT CONTAINER */}
      <div className="print-container max-w-[210mm] mx-auto my-6 bg-white shadow-md border border-[#cbd5e1] print:m-0 print:border-none print:shadow-none">
        <table className="w-full border-collapse">
          {/* REPEATING HEADER */}
          <thead className="print-table-header">
            <tr>
              <th className="p-0 text-left font-normal border-b-2 border-[#0f223d]">
                <div className="px-6 pt-5 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    {/* Brand Logo & Name */}
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-md border border-[#cbd5e1] overflow-hidden bg-white shrink-0">
                        <Image
                          src="/images/mahavir-card-logo.jpeg"
                          alt="Mahavir Card Logo"
                          fill
                          className="object-contain p-0.5"
                          priority
                        />
                      </div>
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-black tracking-tight text-[#0f223d]">
                            {business.name}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider font-semibold text-[#8a632b] px-1.5 py-0.5 rounded bg-[#fcf6ea] border border-[#ecd9b5]">
                            Offset Printing Hub
                          </span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#475569] mt-0.5">
                          {business.tagline}
                        </p>
                        <p className="text-[10px] text-[#64748b] mt-0.5">
                          {business.address}, {business.city} - {business.postalCode} ({business.state})
                        </p>
                      </div>
                    </div>

                    {/* Registration & Contact: In B2B mode, GSTIN is completely removed */}
                    <div className="text-right text-[10px] space-y-0.5">
                      {!isB2BMode && (
                        <div className="inline-block bg-[#0f223d] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                          GSTIN: {business.gstin}
                        </div>
                      )}
                      <p className="text-[#334155] font-semibold pt-0.5">
                        📞 {business.phone}
                      </p>
                      <p className="text-[#64748b]">
                        ✉️ {business.email}
                      </p>
                      <p className="text-[#0f223d] font-medium">
                        🌐 {business.website}
                      </p>
                    </div>
                  </div>

                  {/* Document Title Banner */}
                  <div className="mt-3 pt-2 border-t border-[#e2e8f0] flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold uppercase tracking-wider text-[#0f223d] text-[11px]">
                        ★ Official Rate Catalogue
                      </span>
                      <span className="text-[#94a3b8]">|</span>
                      <span className="font-medium text-[#475569]">
                        Rate Mode:{" "}
                        <strong className="text-[#0f223d]">
                          {priceMode === "BOTH"
                            ? "Trade Wholesale & Retail Rates"
                            : priceMode === "RETAIL"
                            ? "Standard Retail Price List"
                            : "B2B Trade Price List"}
                        </strong>
                      </span>
                    </div>
                    <div className="text-[#64748b]">
                      Effective Date: <strong className="text-[#0f223d]">{generatedDate}</strong>
                    </div>
                  </div>
                </div>
              </th>
            </tr>
          </thead>

          {/* REPEATING FOOTER */}
          <tfoot>
            <tr>
              <td className="p-0 text-left font-normal border-t-2 border-[#0f223d]">
                <div className="px-6 py-2.5 bg-[#f8fafc] text-[9.5px] text-[#475569] leading-tight flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#0f223d]">
                      Production Guidelines:
                    </p>
                    {!isB2BMode && (
                      <p>
                        • All prices are exclusive of 18% GST unless specified. Rates subject to change without prior notice.
                      </p>
                    )}
                    <p>
                      • Production artwork must be submitted in <strong>CorelDRAW (.CDR)</strong> with all fonts converted to curves.
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#0f223d]">
                      Mahavir Card & Paper Cutting
                    </p>
                    <p className="text-[#64748b]">
                      Khadia Golwad, Ahmedabad
                    </p>
                    <p className="text-[8.5px] text-[#94a3b8] mt-0.5">
                      Direct WhatsApp: +91 79847 52154 / +91 94263 71150
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </tfoot>

          {/* DOCUMENT BODY */}
          <tbody>
            <tr>
              <td className="p-0">
                <div className="px-6 py-5 space-y-7">
                  {/* CATEGORIES WITH 2 PRODUCTS PER ROW */}
                  {filteredCategories.map((cat) => {
                    const baseQty = getCategoryBaseQuantity(cat.products);

                    return (
                      <section
                        key={cat.slug}
                        className="category-section page-break-inside-avoid space-y-3"
                      >
                        {/* CATEGORY IN MIDDLE: BOLD, LARGE, WITH QUANTITY IN BRACKETS */}
                        <div className="text-center my-4 pb-2 border-b-2 border-[#0f223d]">
                          <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#0f223d]">
                            {cat.name} ({baseQty.toLocaleString("en-IN")} QTY)
                          </h2>
                        </div>

                        {/* 2 PRODUCTS IN SINGLE ROW */}
                        <div className="grid grid-cols-2 gap-3.5">
                          {cat.products.map((p) => {
                            const addonNote = getAddonNote(p);
                            const isDifferentQty =
                              p.referenceQuantity && p.referenceQuantity !== baseQty;

                            // Pricing calculations
                            const retailRate =
                              p.ruleType === "PER_SQ_INCH"
                                ? `${p.ratePerSqInch}${p.rateUnit === "PAISE" ? " paise" : ""} / sq.in`
                                : p.amount?.toLocaleString("en-IN");

                            const tradeRate =
                              p.ruleType === "PER_SQ_INCH"
                                ? `${p.b2bRatePerSqInch ?? p.ratePerSqInch}${p.rateUnit === "PAISE" ? " paise" : ""} / sq.in`
                                : (p.b2bAmount ?? p.amount)?.toLocaleString("en-IN");

                            return (
                              <div
                                key={p.slug}
                                className="border-2 border-[#cbd5e1] rounded-sm p-3.5 bg-white flex flex-col justify-between page-break-inside-avoid shadow-xs hover:border-[#0f223d] transition-colors"
                              >
                                <div className="flex gap-3">
                                  {/* PRODUCT PHOTO */}
                                  {p.imageUrl && (
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded border border-[#cbd5e1] overflow-hidden bg-slate-100 shrink-0">
                                      <Image
                                        src={p.imageUrl}
                                        alt={p.name}
                                        fill
                                        className="object-cover"
                                        unoptimized
                                      />
                                    </div>
                                  )}

                                  <div className="flex-1 min-w-0">
                                    {/* PRODUCT NAME: SIZED BIG & BOLD */}
                                    <h3 className="text-[13px] sm:text-[14px] font-black uppercase text-[#0f223d] leading-snug tracking-tight">
                                      {p.name}
                                    </h3>

                                    {/* IF QUANTITY DIFFERS FROM CATEGORY BASE */}
                                    {isDifferentQty && (
                                      <div className="text-[11.5px] font-black text-[#0f223d] mt-0.5">
                                        ({p.referenceQuantity?.toLocaleString("en-IN")} Qty)
                                      </div>
                                    )}

                                    {/* ADD-ON IN BRACKETS UNDER PRODUCT NAME */}
                                    {addonNote && (
                                      <div className="text-[11px] font-bold text-[#b45309] mt-0.5 italic">
                                        {addonNote}
                                      </div>
                                    )}

                                    {/* Optional Size */}
                                    {p.size && (
                                      <div className="text-[10.5px] text-[#475569] font-medium mt-0.5">
                                        Size: <strong className="text-[#1e293b]">{p.size}</strong>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* PRICE: INCREASED SIZE */}
                                <div className="mt-3 pt-2 border-t border-[#e2e8f0]">
                                  {priceMode === "RANGE" && (
                                    <div className="text-[16px] sm:text-[18px] font-black text-[#0f223d]">
                                      {p.ruleType === "PER_SQ_INCH"
                                        ? `Range: ${Math.min(p.ratePerSqInch ?? 0, p.b2bRatePerSqInch ?? p.ratePerSqInch ?? 0)} – ${Math.max(p.ratePerSqInch ?? 0, p.b2bRatePerSqInch ?? p.ratePerSqInch ?? 0)} ${p.rateUnit === "PAISE" ? "paise" : "₹"} / sq.in`
                                        : `Range: ₹${Math.min(p.amount ?? 0, p.b2bAmount ?? p.amount ?? 0).toLocaleString("en-IN")} – ₹${Math.max(p.amount ?? 0, p.b2bAmount ?? p.amount ?? 0).toLocaleString("en-IN")}`}
                                    </div>
                                  )}

                                  {priceMode === "B2B" && (
                                    <div className="text-[18px] sm:text-[20px] font-black text-[#0f223d]">
                                      Rate: ₹{tradeRate}
                                    </div>
                                  )}

                                  {priceMode === "RETAIL" && (
                                    <div className="text-[18px] sm:text-[20px] font-black text-[#0f223d]">
                                      Rate: ₹{retailRate}
                                    </div>
                                  )}

                                  {priceMode === "BOTH" && (
                                    <div className="flex items-baseline justify-between gap-2 text-[14px] sm:text-[15px] font-black">
                                      <span className="text-[#0f223d]">
                                        Retail: ₹{retailRate}
                                      </span>
                                      <span className="text-[#8a632b]">
                                        Trade: ₹{tradeRate}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}

                  {/* DEDICATED QUOTABLE COMMERCIAL PRINTING SERVICES MODULE */}
                  {showQuotable && (
                    <section className="quotable-section page-break-inside-avoid space-y-3 pt-3">
                      {/* QUOTABLE HEADER IN MIDDLE */}
                      <div className="text-center my-4 pb-2 border-t-2 border-b-2 border-[#0f223d] pt-3">
                        <div className="inline-block bg-[#8a632b] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs mb-1">
                          Specialized Commercial Services
                        </div>
                        <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-[#0f223d]">
                          On-Demand Quotable Fabrication & Publications
                        </h2>
                        <p className="text-[10px] text-[#64748b] mt-0.5">
                          Direct Quote Line: +91 79847 52154 / +91 94263 71150 · mahavircard2011@gmail.com
                        </p>
                      </div>

                      {/* 4 Commercial Quotable Modules (2 per row) */}
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* Module 1: Books Modules & Multi-page Publications */}
                        <div className="border border-[#cbd5e1] rounded-sm p-3.5 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <BookOpen size={16} />
                            </div>
                            <div>
                              <h3 className="text-[13px] font-bold text-[#0f223d] leading-tight">
                                1. Books Modules & Multi-Page Publications
                              </h3>
                              <p className="text-[9.5px] text-[#8a632b] font-semibold">
                                Annual Reports · Catalogues · Manuals · Magazines
                              </p>
                            </div>
                          </div>
                          <ul className="text-[9.5px] text-[#475569] space-y-1 pl-1">
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Binding Systems:</strong> Perfect binding (hot-melt / PUR glue), saddle stitch (center wire pins), section-sewn hardcover casing, Wire-O & spiral.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Paper Substrates:</strong> Maplitho (70 to 100 GSM), Art Paper (90 to 170 GSM), High-Bulk Cream / Alabaster, Full 4-Color or B/W.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Cover Enhancements:</strong> Thermal Matt / Gloss lamination, Velvet touch, Spot UV, Gold/Silver hot-stamp foil, Embossing.
                              </span>
                            </li>
                          </ul>
                          <div className="pt-1.5 border-t border-[#e2e8f0] flex items-center justify-between text-[9px]">
                            <span className="text-[#64748b]">Sizes: A4, A5, B5, Crown 1/4</span>
                            <span className="font-bold text-[#0f223d] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#cbd5e1]">
                              Quotable upon Spec
                            </span>
                          </div>
                        </div>

                        {/* Module 2: Custom Diaries & Planners */}
                        <div className="border border-[#cbd5e1] rounded-sm p-3.5 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <Calendar size={16} />
                            </div>
                            <div>
                              <h3 className="text-[13px] font-bold text-[#0f223d] leading-tight">
                                2. Custom Corporate Diaries & Planners
                              </h3>
                              <p className="text-[9.5px] text-[#8a632b] font-semibold">
                                Executive PU Leatherette · Dated & Undated Planners
                              </p>
                            </div>
                          </div>
                          <ul className="text-[9.5px] text-[#475569] space-y-1 pl-1">
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Cover Styling:</strong> Premium PU leatherette, hardbound thermal matt, thermo-PU debossing, two-tone stitch finishing.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Personalization:</strong> Blind debossing, metallic foil stamping, custom full-color tip-in pages (company profile & highlights).
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Accessories:</strong> Silk satin bookmark ribbon.
                              </span>
                            </li>
                          </ul>
                          <div className="pt-1.5 border-t border-[#e2e8f0] flex items-center justify-between text-[9px]">
                            <span className="text-[#64748b]">Formats: Day-per-Page, Week-to-View</span>
                            <span className="font-bold text-[#0f223d] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#cbd5e1]">
                              Quotable upon Spec
                            </span>
                          </div>
                        </div>

                        {/* Module 3: Bill Books, Challans & Receipt Vouchers */}
                        <div className="border border-[#cbd5e1] rounded-sm p-3.5 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <Receipt size={16} />
                            </div>
                            <div>
                              <h3 className="text-[13px] font-bold text-[#0f223d] leading-tight">
                                3. Bill Books, Challans & Receipt Vouchers
                              </h3>
                              <p className="text-[9.5px] text-[#8a632b] font-semibold">
                                Duplicate · Triplicate · Quadruplicate Book Sets
                              </p>
                            </div>
                          </div>
                          <ul className="text-[9.5px] text-[#475569] space-y-1 pl-1">
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Paper Grade:</strong> 55-60 GSM high-sensitivity self-copy paper (White, Pink, Yellow, Green, Blue) — clean and smudge-free.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Numbering & Perforation:</strong> Sharp 6-digit consecutive red ink numbering, ultra-fine micro-perforation for clean tear-out.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Binding & Protection:</strong> Stiff strawboard backing, heavy kraft cover, and integrated fold-in write shield protector card.
                              </span>
                            </li>
                          </ul>
                          <div className="pt-1.5 border-t border-[#e2e8f0] flex items-center justify-between text-[9px]">
                            <span className="text-[#64748b]">Standard Sizes: 1/4 (A4), 1/6, 1/8</span>
                            <span className="font-bold text-[#0f223d] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#cbd5e1]">
                              Quotable upon Spec
                            </span>
                          </div>
                        </div>

                        {/* Module 4: Corporate Stationery & Folders Suite */}
                        <div className="border border-[#cbd5e1] rounded-sm p-3.5 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <FileSpreadsheet size={16} />
                            </div>
                            <div>
                              <h3 className="text-[13px] font-bold text-[#0f223d] leading-tight">
                                4. Corporate Stationery & Folders Suite
                              </h3>
                              <p className="text-[9.5px] text-[#8a632b] font-semibold">
                                Letterheads · Envelopes · Folders · Vouchers
                              </p>
                            </div>
                          </div>
                          <ul className="text-[9.5px] text-[#475569] space-y-1 pl-1">
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Executive Letterheads:</strong> 100 GSM Alabaster, 80/100 GSM SS Finish, Bond paper with precision watermark matching.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Peel & Seal Envelopes:</strong> Window & non-window 9.5"x4.25", 10"x12" laminated security envelopes.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Presentation Folders:</strong> 350 GSM Art Card with single/double die-cut pocket, visiting card notch, and matt lamination.
                              </span>
                            </li>
                          </ul>
                          <div className="pt-1.5 border-t border-[#e2e8f0] flex items-center justify-between text-[9px]">
                            <span className="text-[#64748b]">Includes: Challans, Pads & Vouchers</span>
                            <span className="font-bold text-[#0f223d] bg-[#f8fafc] px-1.5 py-0.5 rounded border border-[#cbd5e1]">
                              Quotable upon Spec
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  {/* REMITTANCE & BANKING DETAILS */}
                  <section className="bank-section page-break-inside-avoid border border-[#cbd5e1] rounded p-3.5 bg-[#f8fafc]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-[11px] font-bold uppercase text-[#0f223d] flex items-center gap-1.5">
                          <Building2 size={13} className="text-[#8a632b]" /> Official Bank Accounts for Remittance (NEFT / RTGS / IMPS)
                        </h4>
                        <div className="grid grid-cols-2 gap-4 mt-2 text-[9.5px] text-[#334155]">
                          <div className="border-r border-[#e2e8f0] pr-4">
                            <p className="font-bold text-[#0f223d]">B2B Trade Account:</p>
                            <p>Beneficiary: <strong>MAHAVIR CARD & PAPER CUTTING</strong></p>
                            <p>Bank: Bank of Baroda · Ahmedabad(M) Branch</p>
                            <p>A/C No: <strong>12410200000662</strong> · IFSC: <strong>BARB0GANAHM</strong></p>
                            <p className="text-[9px] text-[#64748b]">UPI: mahavircard2011-4@oksbi</p>
                          </div>
                          <div>
                            <p className="font-bold text-[#0f223d]">B2C / Retail Account:</p>
                            <p>Beneficiary: <strong>MAHAVIR CARD</strong></p>
                            <p>Bank: Bank of Baroda · Ahmedabad(M) Branch</p>
                            <p>A/C No: <strong>03280200003947</strong> · IFSC: <strong>BARB0GANAHM</strong></p>
                            <p className="text-[9px] text-[#64748b]">UPI: mahavircard2011-2@oksbi</p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[9.5px] text-[#64748b] shrink-0 border-l border-[#e2e8f0] pl-4">
                        <p className="font-bold text-[#0f223d]">Artwork & File Uploads:</p>
                        <p>Web: mahavircard.in</p>
                        <p>Email: mahavircard2011@gmail.com</p>
                        <p>WhatsApp: +91 79847 52154</p>
                      </div>
                    </div>
                  </section>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
