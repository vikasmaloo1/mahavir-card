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
  Clock,
  Sparkles,
  Layers,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  AlertCircle,
  Tag,
  Package,
} from "lucide-react";

export type CatalogProductItem = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  shortDescription: string;
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
  imageUrl: string;
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
  phone: "+91 94263 71150",
  email: "mahavircard2011@gmail.com",
  website: "www.mahavircard.in",
  gstin: "24AIUPJ2271L1ZV",
  stateCode: "24 (Gujarat)",
};

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

  const [priceMode, setPriceMode] = useState<"BOTH" | "RETAIL" | "B2B">("BOTH");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showQuotable, setShowQuotable] = useState<boolean>(true);

  const filteredCategories = useMemo(() => {
    if (selectedCategory === "ALL") return categories;
    return categories.filter((c) => c.slug === selectedCategory);
  }, [categories, selectedCategory]);

  const totalActiveProducts = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.products.length, 0);
  }, [categories]);

  return (
    <div className="min-h-screen bg-[#eceff3] text-[#1a202c] font-sans">
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
                onClick={() => setPriceMode("BOTH")}
                className={`px-2.5 py-1 rounded transition-colors ${
                  priceMode === "BOTH"
                    ? "bg-[#0f223d] text-white font-bold"
                    : "text-[#475569] hover:text-black"
                }`}
              >
                Retail & Wholesale
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

      {/* PRINT STYLES */}
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
          .page-break-before-always {
            break-before: page !important;
            page-break-before: always !important;
          }
        }
      `}</style>

      {/* MAIN DOCUMENT CONTAINER */}
      <div className="print-container max-w-[210mm] mx-auto my-6 bg-white shadow-md border border-[#cbd5e1] print:m-0 print:border-none print:shadow-none">
        <table className="w-full border-collapse">
          {/* REPEATING HEADER (Browser repeats thead on all pages in print) */}
          <thead>
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

                    {/* Registration & Contact */}
                    <div className="text-right text-[10px] space-y-0.5">
                      <div className="inline-block bg-[#0f223d] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm">
                        GSTIN: {business.gstin}
                      </div>
                      <p className="text-[#334155] font-semibold pt-1">
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
                        ★ Official Rate Catalogue & Specification Guide
                      </span>
                      <span className="text-[#94a3b8]">|</span>
                      <span className="font-medium text-[#475569]">
                        Rate Mode:{" "}
                        <strong className="text-[#0f223d]">
                          {priceMode === "BOTH"
                            ? "Trade Wholesale & Retail Rates"
                            : priceMode === "RETAIL"
                            ? "Standard Retail Price List"
                            : "B2B Wholesale / Broker Price List"}
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

          {/* REPEATING FOOTER (Browser repeats tfoot on all pages in print) */}
          <tfoot>
            <tr>
              <td className="p-0 text-left font-normal border-t-2 border-[#0f223d]">
                <div className="px-6 py-2.5 bg-[#f8fafc] text-[9.5px] text-[#475569] leading-tight flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-[#0f223d]">
                      Terms & Production Guidelines:
                    </p>
                    <p>
                      • All prices are exclusive of 18% GST unless specified. Rates subject to change without prior notice.
                    </p>
                    <p>
                      • Production artwork must be submitted in <strong>CorelDRAW (.CDR)</strong> with all fonts converted to curves.
                    </p>
                    <p>
                      • Turnaround times are calculated in working days from artwork verification and payment clearance.
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
                      Direct WhatsApp: +91 94263 71150
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
                <div className="px-6 py-4 space-y-6">
                  {/* CATEGORIES WITH PRODUCTS */}
                  {filteredCategories.map((cat) => (
                    <section
                      key={cat.slug}
                      className="category-section page-break-inside-avoid space-y-2.5"
                    >
                      {/* Category Header */}
                      <div className="flex items-center justify-between border-b border-[#0f223d] pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#8a632b]" />
                          <h2 className="text-sm font-bold uppercase tracking-wide text-[#0f223d]">
                            {cat.name}
                          </h2>
                          <span className="text-[10px] text-[#64748b]">
                            ({cat.products.length} {cat.products.length === 1 ? "Product" : "Products"})
                          </span>
                        </div>
                        <span className="text-[10px] text-[#64748b] italic">
                          {cat.description}
                        </span>
                      </div>

                      {/* Products Table */}
                      <div className="border border-[#cbd5e1] rounded overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-[10.5px]">
                          <thead className="bg-[#f1f5f9] border-b border-[#cbd5e1] text-[#334155] font-bold uppercase text-[9px] tracking-wider">
                            <tr>
                              <th className="py-2 px-2.5 w-[65px] text-center">Photo</th>
                              <th className="py-2 px-3">Product & Specifications</th>
                              <th className="py-2 px-2.5 w-[85px]">Turnaround</th>
                              {priceMode === "BOTH" && (
                                <>
                                  <th className="py-2 px-2.5 w-[90px] text-right bg-[#f8fafc]">
                                    Retail (₹)
                                  </th>
                                  <th className="py-2 px-2.5 w-[95px] text-right bg-[#f1f5f9] text-[#0f223d]">
                                    B2B Trade (₹)
                                  </th>
                                </>
                              )}
                              {priceMode === "RETAIL" && (
                                <th className="py-2 px-3 w-[110px] text-right">
                                  Retail Price (₹)
                                </th>
                              )}
                              {priceMode === "B2B" && (
                                <th className="py-2 px-3 w-[110px] text-right text-[#0f223d]">
                                  Wholesale Rate (₹)
                                </th>
                              )}
                              <th className="py-2 px-3 w-[140px]">Finishing / Add-ons</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {cat.products.map((p, idx) => {
                              const isEven = idx % 2 === 0;
                              return (
                                <tr
                                  key={p.slug}
                                  className={`page-break-inside-avoid transition-colors ${
                                    isEven ? "bg-white" : "bg-[#fafbfc]"
                                  }`}
                                >
                                  {/* 1 EXACT PRODUCT PHOTO */}
                                  <td className="py-2 px-2.5 align-middle text-center">
                                    <div className="relative w-12 h-12 mx-auto rounded border border-[#cbd5e1] overflow-hidden bg-[#f8fafc] shrink-0">
                                      <Image
                                        src={p.imageUrl}
                                        alt={p.name}
                                        fill
                                        sizes="48px"
                                        className="object-cover"
                                      />
                                    </div>
                                  </td>

                                  {/* Name & Specs */}
                                  <td className="py-2 px-3 align-top">
                                    <div className="font-bold text-[#0f223d] text-[11px] leading-tight">
                                      {p.name}
                                    </div>
                                    <div className="text-[10px] text-[#475569] mt-0.5 leading-snug">
                                      {p.shortDescription}
                                    </div>
                                    {p.size && (
                                      <div className="inline-flex items-center gap-1 mt-1 text-[9px] font-medium text-[#64748b] bg-[#f1f5f9] px-1.5 py-0.2 rounded border border-[#e2e8f0]">
                                        <span>Size:</span>
                                        <strong className="text-[#334155]">{p.size}</strong>
                                      </div>
                                    )}
                                  </td>

                                  {/* Turnaround */}
                                  <td className="py-2 px-2.5 align-top text-[#475569]">
                                    <div className="flex items-center gap-1 text-[10px]">
                                      <Clock size={11} className="text-[#8a632b] shrink-0" />
                                      <span>{p.productionTime || "3-4 days"}</span>
                                    </div>
                                    {p.referenceQuantity && (
                                      <div className="text-[9px] text-[#64748b] mt-0.5">
                                        Qty: {p.referenceQuantity.toLocaleString("en-IN")}
                                      </div>
                                    )}
                                  </td>

                                  {/* Pricing Columns */}
                                  {priceMode === "BOTH" && (
                                    <>
                                      {/* Retail Rate */}
                                      <td className="py-2 px-2.5 align-top text-right bg-[#f8fafc]">
                                        {p.ruleType === "PER_SQ_INCH" ? (
                                          <div>
                                            <span className="font-bold text-[#0f223d] text-[11px]">
                                              ₹{p.ratePerSqInch}
                                            </span>
                                            <span className="text-[9px] text-[#64748b] block">
                                              {p.rateUnit === "PAISE" ? "paise / sq.in" : "/ sq.inch"}
                                            </span>
                                          </div>
                                        ) : (
                                          <div>
                                            <span className="font-bold text-[#0f223d] text-[11.5px]">
                                              ₹{p.amount?.toLocaleString("en-IN")}
                                            </span>
                                            <span className="text-[9px] text-[#64748b] block">
                                              /{p.referenceQuantity ? p.referenceQuantity.toLocaleString("en-IN") : "job"}
                                            </span>
                                          </div>
                                        )}
                                      </td>

                                      {/* B2B Trade Rate */}
                                      <td className="py-2 px-2.5 align-top text-right bg-[#f1f5f9]">
                                        {p.ruleType === "PER_SQ_INCH" ? (
                                          <div>
                                            <span className="font-extrabold text-[#8a632b] text-[11.5px]">
                                              ₹{p.b2bRatePerSqInch ?? p.ratePerSqInch}
                                            </span>
                                            <span className="text-[9px] text-[#64748b] block">
                                              {p.rateUnit === "PAISE" ? "paise / sq.in" : "/ sq.inch"}
                                            </span>
                                          </div>
                                        ) : (
                                          <div>
                                            <span className="font-extrabold text-[#8a632b] text-[12px]">
                                              ₹{(p.b2bAmount ?? p.amount)?.toLocaleString("en-IN")}
                                            </span>
                                            <span className="text-[9px] text-[#64748b] block">
                                              /{p.referenceQuantity ? p.referenceQuantity.toLocaleString("en-IN") : "job"}
                                            </span>
                                          </div>
                                        )}
                                      </td>
                                    </>
                                  )}

                                  {priceMode === "RETAIL" && (
                                    <td className="py-2 px-3 align-top text-right">
                                      {p.ruleType === "PER_SQ_INCH" ? (
                                        <div>
                                          <span className="font-bold text-[#0f223d] text-[12px]">
                                            ₹{p.ratePerSqInch}
                                          </span>
                                          <span className="text-[9px] text-[#64748b] block">
                                            {p.rateUnit === "PAISE" ? "paise / sq.in" : "/ sq.inch"}
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          <span className="font-bold text-[#0f223d] text-[12px]">
                                            ₹{p.amount?.toLocaleString("en-IN")}
                                          </span>
                                          <span className="text-[9px] text-[#64748b] block">
                                            /{p.referenceQuantity ? p.referenceQuantity.toLocaleString("en-IN") : "job"}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  )}

                                  {priceMode === "B2B" && (
                                    <td className="py-2 px-3 align-top text-right">
                                      {p.ruleType === "PER_SQ_INCH" ? (
                                        <div>
                                          <span className="font-extrabold text-[#8a632b] text-[12px]">
                                            ₹{p.b2bRatePerSqInch ?? p.ratePerSqInch}
                                          </span>
                                          <span className="text-[9px] text-[#64748b] block">
                                            {p.rateUnit === "PAISE" ? "paise / sq.in" : "/ sq.inch"}
                                          </span>
                                        </div>
                                      ) : (
                                        <div>
                                          <span className="font-extrabold text-[#8a632b] text-[12px]">
                                            ₹{(p.b2bAmount ?? p.amount)?.toLocaleString("en-IN")}
                                          </span>
                                          <span className="text-[9px] text-[#64748b] block">
                                            /{p.referenceQuantity ? p.referenceQuantity.toLocaleString("en-IN") : "job"}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                  )}

                                  {/* Finishing & Add-ons */}
                                  <td className="py-2 px-3 align-top text-[9.5px] text-[#475569] space-y-0.5">
                                    {p.addon && (
                                      <div className="flex items-center gap-1 text-[#0f223d] font-semibold">
                                        <Sparkles size={10} className="text-[#8a632b] shrink-0" />
                                        <span>
                                          {p.addon.name}: +₹{p.addon.amount}
                                        </span>
                                      </div>
                                    )}
                                    {p.bladeCharge && (
                                      <div className="text-[#475569]">
                                        Half Blade: ₹{p.bladeCharge} / blade
                                      </div>
                                    )}
                                    {p.minimumCharge && (
                                      <div className="text-[#64748b]">
                                        Min. charge: ₹{p.minimumCharge}
                                      </div>
                                    )}
                                    {p.minimumArea && (
                                      <div className="text-[#64748b]">
                                        Min. area: {p.minimumArea} sq.in
                                      </div>
                                    )}
                                    {p.delivery && (
                                      <div className="text-[8.5px] text-[#64748b] pt-0.5">
                                        Courier: GJ ₹{p.delivery.GJ} | RJ ₹{p.delivery.RJ}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}

                  {/* DEDICATED QUOTABLE COMMERCIAL PRINTING SERVICES MODULE */}
                  {showQuotable && (
                    <section className="quotable-section page-break-inside-avoid space-y-3 pt-2">
                      <div className="border-t-2 border-[#0f223d] pt-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="inline-block bg-[#8a632b] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-xs">
                              Specialized Commercial Services
                            </span>
                            <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#0f223d]">
                              On-Demand Quotable Fabrication & Publications
                            </h2>
                          </div>
                          <p className="text-[10px] text-[#64748b] mt-0.5">
                            Custom offset printing, binding, sequential numbering, and corporate stationery quoted individually based on quantity, paper GSM, and finishing specifications.
                          </p>
                        </div>
                        <div className="text-right text-[9.5px] font-semibold text-[#8a632b]">
                          Direct Quote Line: +91 94263 71150
                        </div>
                      </div>

                      {/* 4 Commercial Quotable Modules Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Module 1: Books Modules & Multi-page Publications */}
                        <div className="border border-[#cbd5e1] rounded p-3 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <BookOpen size={16} />
                            </div>
                            <div>
                              <h3 className="text-[11.5px] font-bold text-[#0f223d] leading-tight">
                                1. Books Modules & Multi-Page Publications
                              </h3>
                              <p className="text-[9px] text-[#8a632b] font-semibold">
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
                        <div className="border border-[#cbd5e1] rounded p-3 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <Calendar size={16} />
                            </div>
                            <div>
                              <h3 className="text-[11.5px] font-bold text-[#0f223d] leading-tight">
                                2. Custom Corporate Diaries & Planners
                              </h3>
                              <p className="text-[9px] text-[#8a632b] font-semibold">
                                Executive PU Leatherette · Dated & Undated Planners
                              </p>
                            </div>
                          </div>
                          <ul className="text-[9.5px] text-[#475569] space-y-1 pl-1">
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Cover Styling:</strong> Imported PU leatherette, hardbound thermal matt, thermo-PU debossing, two-tone stitch finishing.
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Personalization:</strong> Blind debossing, metallic foil stamping, custom full-color tip-in pages (company profile & product highlights).
                              </span>
                            </li>
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>Accessories:</strong> Silk ribbon bookmarks with metal tags, magnetic buckle / elastic band closure, pen loop, document pocket.
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

                        {/* Module 3: Bill Books, Challans & Receipt Books */}
                        <div className="border border-[#cbd5e1] rounded p-3 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <Receipt size={16} />
                            </div>
                            <div>
                              <h3 className="text-[11.5px] font-bold text-[#0f223d] leading-tight">
                                3. Carbonless NCR Bill Books & Vouchers
                              </h3>
                              <p className="text-[9px] text-[#8a632b] font-semibold">
                                Duplicate · Triplicate · Quadruplicate NCR Sets
                              </p>
                            </div>
                          </div>
                          <ul className="text-[9.5px] text-[#475569] space-y-1 pl-1">
                            <li className="flex items-start gap-1.5">
                              <CheckCircle2 size={11} className="text-[#8a632b] shrink-0 mt-0.5" />
                              <span>
                                <strong>NCR Paper Grade:</strong> 55-60 GSM high-sensitivity self-copy paper (White, Pink, Yellow, Green, Blue) — no carbon mess.
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

                        {/* Module 4: Corporate & Office Stationery */}
                        <div className="border border-[#cbd5e1] rounded p-3 bg-white space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded bg-[#f1f5f9] text-[#0f223d] flex items-center justify-center shrink-0">
                              <FileSpreadsheet size={16} />
                            </div>
                            <div>
                              <h3 className="text-[11.5px] font-bold text-[#0f223d] leading-tight">
                                4. Corporate Stationery & Folders Suite
                              </h3>
                              <p className="text-[9px] text-[#8a632b] font-semibold">
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
                                <strong>Peel & Seal Envelopes:</strong> Window & non-window 9.5"x4.25", 10"x12" laminated cloth-line security envelopes.
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
                  <section className="bank-section page-break-inside-avoid border border-[#cbd5e1] rounded p-3 bg-[#f8fafc]">
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
                        <p>WhatsApp: +91 94263 71150</p>
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
