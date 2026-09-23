"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Printer,
  Download,
  Phone,
  MessageCircle,
  Share2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  FileCheck,
  Building2,
  Eye,
  SlidersHorizontal,
  BookOpen,
  Calendar,
  Receipt,
  FileSpreadsheet,
  Package,
  ShoppingBag,
  FolderOpen,
  ShieldCheck,
  Info,
} from "lucide-react";

export type PublicCatalogProduct = {
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
  imageUrl: string;
  finishBadges?: string[];
  addon?: {
    code: string;
    name: string;
    amount: number;
    referenceQuantity?: number;
  };
  bladeCharge?: number;
  minimumArea?: number;
  minimumCharge?: number;
};

export type PublicCatalogCategory = {
  slug: string;
  name: string;
  description: string;
  products: PublicCatalogProduct[];
};

export type PublicCatalogBusinessInfo = {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  primaryPhone: string;
  whatsappPhone: string;
  email: string;
  website: string;
  gstin: string;
};

const defaultBusinessInfo: PublicCatalogBusinessInfo = {
  name: "MAHAVIR CARD",
  tagline: "Commercial Offset Printing & Paper Cutting Hub",
  address: "Khadia Golwad, Opp. Jain Digamber Mandir",
  city: "Ahmedabad",
  state: "Gujarat",
  postalCode: "380001",
  primaryPhone: "+91 94263 71150",
  whatsappPhone: "+91 79847 52154",
  email: "mahavircard2011@gmail.com",
  website: "www.mahavircard.in",
  gstin: "24AIUPJ2271L1ZV",
};

interface PublicProductCatalogProps {
  categories: PublicCatalogCategory[];
  businessInfo?: Partial<PublicCatalogBusinessInfo>;
}

// Commercial / Custom Printing items for the customer printing section
const customCommercialServices = [
  {
    title: "1. Books, Catalogues & Multi-Page Publications",
    subtitle: "Annual Reports · Product Catalogues · Manuals · Magazines",
    image: "/images/products/luxury-brochures-ad.jpg",
    icon: BookOpen,
    specs: [
      "Binding Systems: Perfect binding (hot-melt / PUR glue), saddle-stitch wire pins, section-sewn hardcover casing, Wire-O & spiral.",
      "Paper Substrates: Maplitho (70 to 100 GSM), Art Paper (90 to 170 GSM), High-Bulk Cream / Alabaster, Full 4-Color or B/W.",
      "Cover Enhancements: Thermal Matt / Gloss lamination, Velvet touch, Spot UV, Gold/Silver hot-stamp foil, Embossing.",
    ],
    sizes: "Sizes: A4, A5, B5, Crown 1/4",
    turnaround: "5-7 working days",
  },
  {
    title: "2. Custom Corporate Diaries & Planners",
    subtitle: "Executive PU Leatherette · Dated & Undated Planners · Organizers",
    image: "/images/products/executive-diaries-ad.jpg",
    icon: Calendar,
    specs: [
      "Cover Styling: Premium PU leatherette, hardbound thermal matt, thermo-PU debossing, two-tone stitch finishing.",
      "Personalization: Blind debossing, metallic foil stamping, custom full-color tip-in pages (company profile & highlights).",
      "Accessories: Silk satin bookmark ribbon, elastic band closure, and magnetic clip locks.",
    ],
    sizes: "Formats: Day-per-Page, Week-to-View, Executive A5",
    turnaround: "7-10 working days",
  },
  {
    title: "3. Carbonless Bill Books, Challans & Receipt Vouchers",
    subtitle: "Duplicate · Triplicate · Quadruplicate Book Sets · Numbered",
    image: "/images/products/receipt-books-ad.jpg",
    icon: Receipt,
    specs: [
      "Paper Grade: 55-60 GSM high-sensitivity self-copy paper (White, Pink, Yellow, Green, Blue) — clean and smudge-free.",
      "Numbering & Perforation: Sharp 6-digit consecutive red ink numbering, ultra-fine micro-perforation for clean tear-out.",
      "Binding & Protection: Stiff strawboard backing, heavy kraft cover, and integrated fold-in write shield protector card.",
    ],
    sizes: "Standard Sizes: 1/4 (A4), 1/6, 1/8",
    turnaround: "3-5 working days",
  },
  {
    title: "4. Presentation Folders & Corporate Stationery Kits",
    subtitle: "Document Folders · Proposal Folders · Certificate Jackets",
    image: "/images/products/presentation-folder-ad.jpg",
    icon: FileSpreadsheet,
    specs: [
      "Folder Board: 350-400 GSM imported Art Card with high stiffness and crease-resistant scoring.",
      "Pocket Engineering: Single or double die-cut glued pockets with business card slit holder.",
      "Surface Lamination: Thermal Matt or Soft-Touch Velvet with selective raised Spot UV highlights.",
    ],
    sizes: "Fits standard A4 (9\" × 12\" closed)",
    turnaround: "4-6 working days",
  },
  {
    title: "5. Custom Packaging Boxes & Monocartons",
    subtitle: "Product Boxes · Cosmetic Cartons · Pharma Sleeves · Gift Boxes",
    image: "/images/products/packaging-boxes-ad.jpg",
    icon: Package,
    specs: [
      "Board Grades: 300 to 450 GSM FBB (Folding Box Board), SBS Board, and Duplex grey-back board.",
      "Die Punching & Gluing: High-precision laser die punching, window patching with clear PET sheet, and auto-lock bottoms.",
      "Special Effects: Hybrid drip-off textured varnish, metallic foil embossing, and anti-scuff matte finish.",
    ],
    sizes: "Customized to product dimensions",
    turnaround: "7-10 working days",
  },
  {
    title: "6. Premium Branded Paper Bags & Shopping Bags",
    subtitle: "Retail Bags · Exhibition Bags · Boutique Carry Bags · Kraft Bags",
    image: "/images/products/paper-bags-ad.jpg",
    icon: ShoppingBag,
    specs: [
      "Paper Substrates: 170-300 GSM Art Paper with lamination or 150-250 GSM Eco-friendly Brown/White Virgin Kraft.",
      "Handles & Reinforcement: Twisted paper rope, braided cotton cord, or satin ribbon handles with eyelet reinforcement.",
      "Base Card: Heavy bottom stiffener card for high weight-bearing durability.",
    ],
    sizes: "Small, Medium, Large & Custom Bottega Sizes",
    turnaround: "6-8 working days",
  },
  {
    title: "7. Hospital & Medical OPD / IPD File Folders",
    subtitle: "Patient Case History Folders · Pathology Report Jackets · Hospital Files",
    image: "/images/products/medical-file-folder-ad.jpg",
    icon: FolderOpen,
    specs: [
      "Board Grade: 300-350 GSM heavy laminated Art Card or calibrated kraft board.",
      "Fasteners & Clips: High-strength plastic cobra clips or flexible 2-hole wire prongs.",
      "Internal Storage: Dedicated pockets for prescription slips, X-ray envelopes, and doctor consultation sheets.",
    ],
    sizes: "Standard Medical A4 & Legal 10\" × 14\"",
    turnaround: "4-6 working days",
  },
  {
    title: "8. Security Vouchers, Coupons & Barcoded Passes",
    subtitle: "Gift Vouchers · Event Entry Passes · Loyalty Discount Coupons",
    image: "/images/products/security-vouchers-ad.jpg",
    icon: ShieldCheck,
    specs: [
      "Security Technology: Variable data alphanumeric serials, 1D/2D QR barcodes, and anti-counterfeiting guilloche patterns.",
      "Features: Scratch-off latex foil coating, dual counterfoil perforations, and security pantographs.",
      "Substrates: 130 to 300 GSM coated art card or security tearable synthetic substrates.",
    ],
    sizes: "Standard Ticket & Wallet Sizes",
    turnaround: "3-5 working days",
  },
];

export function PublicProductCatalog({
  categories,
  businessInfo: propBusiness,
}: PublicProductCatalogProps) {
  const business = { ...defaultBusinessInfo, ...propBusiness };

  const [priceMode, setPriceMode] = useState<"RANGE" | "RETAIL" | "B2B" | "SHOWROOM">("RANGE");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [copiedLink, setCopiedLink] = useState(false);

  const cleanPhone = business.whatsappPhone.replace(/[^0-9]/g, "");

  const filteredCategories = useMemo(() => {
    if (selectedCategory === "ALL") return categories;
    return categories.filter((c) => c.slug === selectedCategory);
  }, [categories, selectedCategory]);

  const totalProducts = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.products.length, 0);
  }, [categories]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleShareWhatsApp = (productName?: string) => {
    const text = productName
      ? `Hello Mahavir Card, I am interested in *${productName}* from your product catalogue. Please share specs and quotation: https://mahavircard.in/catalog`
      : `Hello Mahavir Card, please share your complete commercial printing catalogue and trade price details: https://mahavircard.in/catalog`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-[#0f172a] font-sans antialiased selection:bg-[#09192e] selection:text-white print:bg-white print:text-black">
      {/* PRINT STYLES: CLEAN A4 FORMATTING WITH ZERO CLUTTER */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
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
          }
          .page-break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-grid-cols-2 {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 10px !important;
          }
        }
      `}</style>

      {/* TOP EMERGENCY HELPLINE BAR */}
      <div className="no-print bg-[#09192e] text-white text-xs py-2 px-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[#c59b27] text-[#09192e]">
              Press Direct Help Line
            </span>
            <span className="text-slate-300 hidden sm:inline">
              Direct Order & Price Support:
            </span>
            <a
              href={`tel:${cleanPhone}`}
              className="font-bold text-white hover:text-[#c59b27] flex items-center gap-1"
            >
              <Phone size={13} className="text-[#c59b27]" /> {business.whatsappPhone}
            </a>
            <span className="text-slate-500">|</span>
            <a
              href={`tel:${business.primaryPhone.replace(/[^0-9]/g, "")}`}
              className="text-slate-300 hover:text-white"
            >
              {business.primaryPhone}
            </a>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <a
              href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                "Hello Mahavir Card, I would like to inquire about commercial printing catalogue & rates."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[#25d366] hover:text-[#20ba5a] font-semibold"
            >
              <MessageCircle size={14} /> WhatsApp: {business.whatsappPhone}
            </a>
            <span className="text-slate-600 hidden md:inline">•</span>
            <span className="text-slate-400 hidden md:inline">
              Khadia Golwad, Ahmedabad
            </span>
          </div>
        </div>
      </div>

      {/* STICKY INTERACTIVE TOOLBAR */}
      <header className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2.5 group"
              title="Return to Mahavir Card Home"
            >
              <div className="relative w-10 h-10 rounded-full border border-slate-200 overflow-hidden bg-white shrink-0 shadow-xs">
                <Image
                  src="/api/branding/assets/logo.primary/file"
                  alt="Mahavir Card Logo"
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-[#09192e] group-hover:text-[#c59b27] transition-colors leading-none block">
                  Mahavir Card
                </span>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Product & Rate Catalogue
                </span>
              </div>
            </Link>
            <div className="hidden lg:block h-6 w-px bg-slate-200 mx-2" />
            <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
              <Sparkles size={13} className="text-[#c59b27]" /> {totalProducts} Products with Real Photos & Prices
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Price Display Selector */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPriceMode("RANGE")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  priceMode === "RANGE"
                    ? "bg-[#09192e] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Display standard price ranges (e.g. ₹240 - ₹270 / 1000 pcs)"
              >
                🏷️ Price Ranges
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("B2B")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  priceMode === "B2B"
                    ? "bg-[#09192e] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Display B2B wholesale trade prices"
              >
                💼 Trade Wholesale
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("RETAIL")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  priceMode === "RETAIL"
                    ? "bg-[#09192e] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Display standard retail rates"
              >
                🏪 Standard Retail
              </button>
              <button
                type="button"
                onClick={() => setPriceMode("SHOWROOM")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  priceMode === "SHOWROOM"
                    ? "bg-[#09192e] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Hide prices to present cleanly to clients/retail customers"
              >
                👁️ Showroom (No Prices)
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#09192e]"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.products.length})
                </option>
              ))}
            </select>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 bg-[#09192e] hover:bg-[#132c50] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all"
            >
              <Printer size={14} /> Print / Save PDF
            </button>

            {/* Direct Booklet Download */}
            <a
              href="/mahavir-card-catalogue.pdf"
              download="Mahavir-Card-Complete-Catalogue.pdf"
              className="inline-flex items-center gap-1.5 bg-[#c59b27] hover:bg-[#b0871e] text-[#09192e] px-3.5 py-1.5 rounded-lg text-xs font-black shadow-xs transition-all"
            >
              <Download size={14} /> Full Booklet PDF
            </a>

            {/* Share Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              title="Copy catalogue link to send to clients"
            >
              <Share2 size={13} /> {copiedLink ? "Link Copied!" : "Share Link"}
            </button>
          </div>
        </div>
      </header>

      {/* HERO BANNER FOR CLIENT BROWSING */}
      <section className="no-print bg-gradient-to-b from-[#09192e] to-[#0d223f] text-white py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold text-[#c59b27]">
                <Sparkles size={14} /> Complete 2026 Commercial Printing Collection
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                Official Product &amp; Specification Directory
              </h1>
              <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
                Browse our complete production line of commercial visiting cards, luxury embellishments, executive stationery, brochures, product labels, and custom printing services with transparent price ranges.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                    "Hello Mahavir Card, I am browsing your product catalogue and would like to place an order or get a quote."
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25d366] hover:bg-[#20ba5a] text-[#09192e] px-5 py-2.5 rounded-xl font-black text-sm shadow-md transition-all"
                >
                  <MessageCircle size={18} /> Chat on WhatsApp ({business.whatsappPhone})
                </a>
                <a
                  href={`tel:${cleanPhone}`}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-xl font-bold text-sm transition-all"
                >
                  <Phone size={16} /> Call: {business.whatsappPhone}
                </a>
                <a
                  href="/mahavir-card-catalogue.pdf"
                  download="Mahavir-Card-Complete-Catalogue.pdf"
                  className="inline-flex items-center gap-2 text-slate-300 hover:text-white underline underline-offset-4 text-xs font-semibold py-1"
                >
                  <Download size={14} /> Download 12-Page Illustrated Booklet (.PDF)
                </a>
              </div>
            </div>

            {/* Quick Specs Card */}
            <div className="lg:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-5 space-y-3.5">
              <h2 className="text-sm font-black uppercase tracking-wider text-[#c59b27] flex items-center gap-2">
                <FileCheck size={16} /> Production Guidelines
              </h2>
              <ul className="text-xs text-slate-200 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#c59b27] shrink-0 mt-0.5" />
                  <span><strong>Artwork Format:</strong> CorelDRAW (.CDR) with all fonts converted to curves.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#c59b27] shrink-0 mt-0.5" />
                  <span><strong>Color Mode:</strong> CMYK with minimum 300 DPI resolution for ultra-sharp offset reproduction.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-[#c59b27] shrink-0 mt-0.5" />
                  <span><strong>Dispatch:</strong> Same-day &amp; scheduled parcel dispatch all over Gujarat, Rajasthan &amp; Pan-India.</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-white/15 flex items-center justify-between text-[11px] text-slate-300">
                <span>GST: <strong>{business.gstin}</strong></span>
                <span>Ahmedabad Hub</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN PRINT / DOCUMENT CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 print:p-0 print:m-0 print:max-w-none">
        {/* PRINT ONLY HEADER */}
        <div className="hidden print:block mb-6 border-b-2 border-[#09192e] pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded border border-slate-300 overflow-hidden bg-white shrink-0">
                <Image
                  src="/api/branding/assets/logo.primary/file"
                  alt="Mahavir Card Logo"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#09192e] leading-tight">
                  {business.name}
                </h1>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  {business.tagline}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {business.address}, {business.city} - {business.postalCode} ({business.state})
                </p>
              </div>
            </div>

            <div className="text-right text-[10px] space-y-0.5">
              <div className="inline-block bg-[#09192e] text-white text-[9px] font-bold px-2 py-0.5 rounded">
                GSTIN: {business.gstin}
              </div>
              <p className="text-slate-800 font-bold pt-0.5">
                📞 {business.whatsappPhone} / {business.primaryPhone}
              </p>
              <p className="text-slate-600">
                ✉️ {business.email} · 🌐 {business.website}
              </p>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
            <span className="font-extrabold uppercase text-[#09192e]">
              ★ Official Rate Catalogue ({priceMode === "RANGE" ? "Price Ranges" : priceMode === "B2B" ? "B2B Wholesale" : priceMode === "RETAIL" ? "Standard Retail" : "Showroom Collection"})
            </span>
            <span className="text-slate-500">
              Helpline: {business.whatsappPhone}
            </span>
          </div>
        </div>

        {/* CATEGORIES SECTIONS WITH REAL PRODUCT PHOTOS & PRICE RANGES */}
        <div className="space-y-12 print:space-y-8">
          {filteredCategories.map((category) => {
            return (
              <section
                key={category.slug}
                id={category.slug}
                className="space-y-4 page-break-inside-avoid"
              >
                {/* Section Header */}
                <div className="border-b-2 border-[#09192e] pb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#09192e]">
                      {category.name}
                    </h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {category.description}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#c59b27] bg-[#c59b27]/10 px-2.5 py-1 rounded-full border border-[#c59b27]/20">
                    {category.products.length} Products
                  </span>
                </div>

                {/* Product Grid: 2 per row in print & medium screen, 3 per row on xl */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 print-grid-cols-2 print:gap-3">
                  {category.products.map((product) => {
                    // Compute Price Range or specific rate
                    let priceString = "";
                    let priceSubLabel = "";

                    if (product.ruleType === "PER_SQ_INCH") {
                      const retailRate = product.ratePerSqInch ?? 0;
                      const b2bRate = product.b2bRatePerSqInch ?? retailRate;
                      const unit = product.rateUnit === "PAISE" ? "paise" : "₹";
                      const minRate = Math.min(retailRate, b2bRate);
                      const maxRate = Math.max(retailRate, b2bRate);

                      if (priceMode === "SHOWROOM") {
                        priceString = "Available on Order";
                        priceSubLabel = "Custom Sq.Inch Area";
                      } else if (priceMode === "B2B") {
                        priceString = `${unit === "₹" ? "₹" : ""}${b2bRate} ${unit === "paise" ? "paise" : ""} / sq.in`;
                        priceSubLabel = "Trade B2B Rate";
                      } else if (priceMode === "RETAIL") {
                        priceString = `${unit === "₹" ? "₹" : ""}${retailRate} ${unit === "paise" ? "paise" : ""} / sq.in`;
                        priceSubLabel = "Standard Retail";
                      } else {
                        // RANGE mode
                        if (minRate === maxRate) {
                          priceString = `${unit === "₹" ? "₹" : ""}${minRate} ${unit === "paise" ? "paise" : ""} / sq.in`;
                        } else {
                          priceString = `${minRate} – ${maxRate} ${unit} / sq.in`;
                        }
                        priceSubLabel = "Price Range (Trade - Retail)";
                      }
                    } else {
                      const retailAmt = product.amount ?? 0;
                      const b2bAmt = product.b2bAmount ?? retailAmt;
                      const minAmt = Math.min(retailAmt, b2bAmt);
                      const maxAmt = Math.max(retailAmt, b2bAmt);
                      const qty = product.referenceQuantity || 1000;

                      if (priceMode === "SHOWROOM") {
                        priceString = "Available on Order";
                        priceSubLabel = `${qty.toLocaleString("en-IN")} pcs batch`;
                      } else if (priceMode === "B2B") {
                        priceString = `₹${b2bAmt.toLocaleString("en-IN")}`;
                        priceSubLabel = `Trade Rate / ${qty.toLocaleString("en-IN")} pcs`;
                      } else if (priceMode === "RETAIL") {
                        priceString = `₹${retailAmt.toLocaleString("en-IN")}`;
                        priceSubLabel = `Retail Rate / ${qty.toLocaleString("en-IN")} pcs`;
                      } else {
                        // RANGE mode
                        if (minAmt === maxAmt) {
                          priceString = `₹${minAmt.toLocaleString("en-IN")}`;
                        } else {
                          priceString = `₹${minAmt.toLocaleString("en-IN")} – ₹${maxAmt.toLocaleString("en-IN")}`;
                        }
                        priceSubLabel = `Per ${qty.toLocaleString("en-IN")} pcs batch`;
                      }
                    }

                    return (
                      <div
                        key={product.slug}
                        className="page-break-inside-avoid bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-[#09192e]/40 transition-all flex flex-col justify-between"
                      >
                        <div>
                          {/* PRODUCT IMAGE */}
                          <div className="relative aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
                              fill
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              unoptimized
                            />
                            {product.referenceQuantity && (
                              <div className="absolute top-2.5 left-2.5 bg-[#09192e]/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                                {product.referenceQuantity.toLocaleString("en-IN")} Qty Batch
                              </div>
                            )}
                            {product.productionTime && (
                              <div className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-[#09192e] text-[10px] font-semibold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                                <Clock size={11} className="text-[#c59b27]" /> {product.productionTime}
                              </div>
                            )}
                          </div>

                          {/* PRODUCT DETAILS */}
                          <div className="p-4 space-y-2.5">
                            <div>
                              <h3 className="text-base font-black text-[#09192e] leading-snug tracking-tight">
                                {product.name}
                              </h3>
                              {product.shortDescription && (
                                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                  {product.shortDescription}
                                </p>
                              )}
                            </div>

                            {/* Badges / Highlights */}
                            <div className="flex flex-wrap gap-1.5 text-[10px]">
                              {product.size && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                  Size: {product.size}
                                </span>
                              )}
                              {product.addon && (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                                  + {product.addon.name} Available
                                </span>
                              )}
                              {product.bladeCharge && (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                  Half Blade: ₹{product.bladeCharge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* PRICE & ACTION BAR */}
                        <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/70">
                          <div className="flex items-end justify-between gap-2">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                                {priceSubLabel}
                              </span>
                              <span className="text-lg font-black text-[#09192e] tracking-tight">
                                {priceString}
                              </span>
                            </div>

                            {/* Inquire on WhatsApp Button */}
                            <button
                              type="button"
                              onClick={() => handleShareWhatsApp(product.name)}
                              className="no-print inline-flex items-center gap-1 bg-[#25d366] hover:bg-[#20ba5a] text-[#09192e] px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
                              title="Ask quote for this product on WhatsApp"
                            >
                              <MessageCircle size={13} /> Order / Inquire
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {/* CUSTOM COMMERCIAL & CUSTOMER PRINTING SECTION */}
          <section className="space-y-6 pt-4 page-break-inside-avoid">
            <div className="text-center max-w-3xl mx-auto space-y-2 border-t-2 border-b-2 border-[#09192e] py-4">
              <span className="inline-block bg-[#c59b27] text-[#09192e] text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full">
                On-Demand Customer Fabrication
              </span>
              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#09192e]">
                Custom Commercial Printing &amp; Publications
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Specialized bulk fabrication tailored to custom dimensions, heavy GSM stocks, specialty finishes, and company branding. Send your specifications directly to <strong>{business.whatsappPhone}</strong>.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 print-grid-cols-2 print:gap-3">
              {customCommercialServices.map((service, idx) => {
                const IconComponent = service.icon;
                return (
                  <div
                    key={idx}
                    className="page-break-inside-avoid bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo */}
                      <div className="relative aspect-[16/10] w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                        <Image
                          src={service.image}
                          alt={service.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute top-2.5 left-2.5 bg-[#09192e]/90 text-white p-1.5 rounded shadow-xs">
                          <IconComponent size={14} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-black text-[#09192e] leading-snug">
                          {service.title}
                        </h3>
                        <p className="text-[11px] font-semibold text-[#c59b27]">
                          {service.subtitle}
                        </p>

                        <ul className="text-[11px] text-slate-600 space-y-1.5 pt-1">
                          {service.specs.map((item, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <CheckCircle2 size={12} className="text-[#c59b27] shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 pt-3 border-t border-slate-100 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{service.sizes}</span>
                        <span className="font-semibold text-slate-700">{service.turnaround}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleShareWhatsApp(service.title)}
                        className="no-print w-full flex items-center justify-center gap-1.5 bg-[#09192e] hover:bg-[#132c50] text-white py-1.5 px-3 rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        <MessageCircle size={13} className="text-[#25d366]" /> Get Custom Spec Quote
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* BANKING REMITTANCE & DISPATCH DETAILS */}
          <section className="page-break-inside-avoid bg-white rounded-2xl border border-slate-300 p-6 shadow-xs">
            <div className="grid md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-8 space-y-3">
                <h3 className="text-base font-black uppercase text-[#09192e] flex items-center gap-2">
                  <Building2 size={18} className="text-[#c59b27]" /> Official Bank Remittance Details (NEFT / RTGS / IMPS)
                </h3>
                <div className="grid sm:grid-cols-2 gap-4 text-xs text-slate-700">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-[#09192e]">B2B Trade Account:</p>
                    <p className="mt-0.5 font-semibold">MAHAVIR CARD &amp; PAPER CUTTING</p>
                    <p>Bank of Baroda · Ahmedabad(M) Branch</p>
                    <p className="font-mono font-bold mt-1 text-[#09192e]">A/C: 12410200000662</p>
                    <p className="font-mono text-slate-500">IFSC: BARB0GANAHM</p>
                    <p className="text-[10px] text-slate-400 mt-1">UPI: mahavircard2011-4@oksbi</p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="font-bold text-[#09192e]">Retail / General Account:</p>
                    <p className="mt-0.5 font-semibold">MAHAVIR CARD</p>
                    <p>Bank of Baroda · Ahmedabad(M) Branch</p>
                    <p className="font-mono font-bold mt-1 text-[#09192e]">A/C: 03280200003947</p>
                    <p className="font-mono text-slate-500">IFSC: BARB0GANAHM</p>
                    <p className="text-[10px] text-slate-400 mt-1">UPI: mahavircard2011-2@oksbi</p>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 bg-[#09192e] text-white p-5 rounded-xl space-y-3 text-xs">
                <p className="font-black text-[#c59b27] uppercase tracking-wider text-sm">
                  Send Orders &amp; Files:
                </p>
                <p className="text-slate-300">
                  Submit CDR files converted to curves for instant production job queuing.
                </p>
                <div className="space-y-1.5 pt-1">
                  <p className="flex items-center gap-2 text-white font-bold">
                    <Phone size={14} className="text-[#c59b27]" /> {business.whatsappPhone}
                  </p>
                  <p className="flex items-center gap-2 text-white font-bold">
                    <MessageCircle size={14} className="text-[#25d366]" /> WhatsApp: {business.whatsappPhone}
                  </p>
                  <p className="text-slate-300">
                    ✉️ {business.email}
                  </p>
                  <p className="text-[#c59b27] font-mono">
                    🌐 {business.website}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* FLOATING WHATSAPP BUTTON FOR CLIENT MOBILE USERS */}
      <aside className="no-print fixed bottom-5 right-5 z-40" aria-label="WhatsApp quick contact">
        <a
          href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
            "Hello Mahavir Card, I have an inquiry regarding your product catalogue."
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#25d366] hover:bg-[#20ba5a] text-[#09192e] px-4 py-3 rounded-full font-black text-sm shadow-xl transition-all hover:scale-105"
        >
          <MessageCircle size={20} />
          <span className="hidden sm:inline">WhatsApp Order: {business.whatsappPhone}</span>
          <span className="sm:hidden">WhatsApp</span>
        </a>
      </aside>

      {/* DOCUMENT FOOTER FOR PRINT */}
      <footer className="hidden print:block mt-8 pt-3 border-t-2 border-[#09192e] text-[9px] text-slate-600">
        <div className="flex justify-between items-center">
          <div>
            <p className="font-bold text-[#09192e]">Mahavir Card · Ahmedabad Commercial Offset Printing</p>
            <p>Direct Press &amp; Artwork Helpline: {business.whatsappPhone} / {business.primaryPhone} · {business.email}</p>
          </div>
          <div className="text-right font-mono">
            mahavircard.in
          </div>
        </div>
      </footer>
    </div>
  );
}
