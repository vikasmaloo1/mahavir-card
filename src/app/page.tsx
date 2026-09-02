import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, FileCheck2, FileUp, MapPin, PackageCheck, Printer, ReceiptText, ShoppingBag } from "lucide-react";

import { HomeCatalogSections } from "@/components/home-catalog-sections";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export const metadata: Metadata = {
  title: "Mahavir Card | Visiting Card & Commercial Offset Printing in Ahmedabad, Gujarat",
  description: "Ahmedabad's commercial offset printing press. Visiting cards (NT, Tearable, Thermal Matt, Velvet, Foil, Spot UV), brochures, stickers, letterheads, and envelopes with instant pricing and CDR upload.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Mahavir Card | Visiting Card & Commercial Offset Printing in Ahmedabad, Gujarat",
    description: "Order visiting cards, brochures, stickers, and business stationery online with live pricing and CDR artwork upload from Ahmedabad's trusted printing press.",
    url: "https://mahavircard.in",
    siteName: "Mahavir Card",
    locale: "en_IN",
    type: "website",
    images: [{ url: "/images/home-hero-printing.jpg", width: 1200, height: 630, alt: "Mahavir Card Ahmedabad Offset Printing Services" }],
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "ProfessionalService"],
  "@id": "https://mahavircard.in/#business",
  name: "Mahavir Card",
  alternateName: "Mahavir Card Offset Printing",
  image: "https://mahavircard.in/images/home-hero-printing.jpg",
  logo: "https://mahavircard.in/api/branding/assets/logo.primary/file",
  url: "https://mahavircard.in",
  telephone: "+919426371150",
  email: "mahavircard2011@gmail.com",
  priceRange: "₹₹",
  currenciesAccepted: "INR",
  paymentAccepted: "Cash, UPI, Credit Card, Debit Card, Net Banking",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Khadia Golwad, Opp. Jain Digamber Mandir",
    addressLocality: "Ahmedabad",
    addressRegion: "Gujarat",
    postalCode: "380001",
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 23.0232,
    longitude: 72.5938,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:30",
      closes: "20:30",
    },
  ],
  areaServed: [
    { "@type": "City", name: "Ahmedabad" },
    { "@type": "AdministrativeArea", name: "Gujarat" },
    { "@type": "AdministrativeArea", name: "Rajasthan" },
    { "@type": "Country", name: "India" },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Commercial Printing Services",
    itemListElement: [
      {
        "@type": "OfferCatalog",
        name: "Visiting Cards & Business Cards",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "NT Single Visiting Card Printing" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "NT Front Back Visiting Card Printing" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Tearable Art Card Visiting Cards 250 GSM" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "400 GSM Thermal Matt Visiting Cards with Spot UV" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "400 GSM Velvet Business Cards with Foil & Drip-Off" } },
        ],
      },
      {
        "@type": "OfferCatalog",
        name: "Brochures, Leaflets & Flyers",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "A4 Art Paper Brochure Printing" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "A8 250 GSM Tearable Brochure Printing" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "130 GSM & 170 GSM Leaflet Printing" } },
        ],
      },
      {
        "@type": "OfferCatalog",
        name: "Stationery, Letterheads & Envelopes",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Letterhead Printing (Alabaster & SS Finish)" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Custom Envelope & Cover Printing" } },
        ],
      },
      {
        "@type": "OfferCatalog",
        name: "Stickers & Product Labels",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Standard Adhesive Sticker Printing" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Avery Sticker Printing (Laminated & Non-Laminated)" } },
        ],
      },
    ],
  },
};

export default function Home() {
  return (
    <main className="mc-storefront min-h-screen bg-[#fcfbf9] text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <StorefrontHeader />
      <CustomerNotices placement="HOME" />

      {/* 1. EDITORIAL HERO SECTION */}
      <section className="relative border-b border-slate-200/80 bg-white">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-4 py-10 sm:py-14 lg:grid-cols-[1fr_1.1fr] lg:px-8 lg:py-16">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-xs">
              <span className="size-2 rounded-full bg-[#1e3a5f]" />
              Commercial Offset Printing · Ahmedabad, Gujarat
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-[3.5rem] lg:leading-[1.1]">
              Premium Printing. <span className="text-[#1e3a5f]">Made Simple.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Business cards, brochures, stickers, stationery and commercial printing — ordered online with transparent pricing and direct CDR file upload.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1e3a5f] px-7 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152a45]"
              >
                Order Now <ArrowRight size={17} />
              </Link>
              <Link
                href="#categories"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-4 text-sm font-bold text-slate-800 shadow-xs transition hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
              >
                Explore Printing <ReceiptText size={17} />
              </Link>
            </div>

            {/* Subtle Local Proof Badge */}
            <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500">
              <MapPin size={16} className="shrink-0 text-[#1e3a5f]" />
              <span>Press Facility: Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad</span>
            </div>
          </div>

          {/* Right Hero Image */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-lg sm:aspect-[16/10]">
            <Image
              src="/images/home-hero-printing.jpg"
              alt="Premium printed stationery, luxury visiting cards with spot UV, folded brochure and pantone guide"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/80 bg-white/95 p-3.5 shadow-md backdrop-blur-xs">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-[#1e3a5f]">Ready to Print</p>
                <p className="text-sm font-semibold text-slate-900">Live Prices · Online Specs · CDR Pre-Press Proof</p>
              </div>
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">Gujarat &amp; Rajasthan</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. TRUST & VALUE 4-PILLAR STRIP */}
      <section className="border-b border-slate-200/80 bg-[#f8fafc]">
        <div className="mx-auto grid max-w-[1440px] gap-6 px-4 py-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#1e3a5f] shadow-xs">
              <FileCheck2 size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Premium Print Quality</p>
              <p className="mt-0.5 text-xs text-slate-500">Heavy 250–400 GSM cards &amp; precision laminations</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#1e3a5f] shadow-xs">
              <Printer size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Commercial Printing</p>
              <p className="mt-0.5 text-xs text-slate-500">Direct offset press capacity from 500 to 50,000+</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#1e3a5f] shadow-xs">
              <Clock3 size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Fast Turnaround</p>
              <p className="mt-0.5 text-xs text-slate-500">1–2 days visiting cards, 3–5 days brochures</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-[#1e3a5f] shadow-xs">
              <MapPin size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Ahmedabad Based</p>
              <p className="mt-0.5 text-xs text-slate-500">Khadia Golwad press facility &amp; counter pickup</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PRIMARY CATEGORIES WITH DEDICATED PHOTOGRAPHY */}
      <HomeCatalogSections initialCategories={[]} />

      {/* 4. MID-PAGE PROMOTIONAL BANNER (Dynamic CMS Placed) */}
      <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-8">
        <PromotionalBanner placement="HOME_HERO_BOTTOM" />
      </div>

      {/* 5. COMMERCIAL PRINTING PROCESS (5 STEPS) */}
      <section className="border-y border-slate-200/80 bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 shadow-xs">
              <span className="size-1.5 rounded-full bg-[#1e3a5f]" />
              Streamlined Workflow
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              How Commercial Ordering Works
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
              From your CorelDRAW artwork file to physical delivery — transparent, trackable, and dependable.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {[
              {
                step: "01",
                title: "Choose Product",
                desc: "Select visiting cards, 250 GSM brochures, stickers, or letterheads.",
              },
              {
                step: "02",
                title: "Customize Specs",
                desc: "Choose exact quantity, paper stock, velvet/matt finish, and sizing.",
              },
              {
                step: "03",
                title: "Upload CDR File",
                desc: "Upload production CorelDRAW file with safe bleed and margins.",
              },
              {
                step: "04",
                title: "Confirm Order",
                desc: "Instant live pricing with itemized GST breakdown and secure payment.",
              },
              {
                step: "05",
                title: "Print & Dispatch",
                desc: "Offset press run, pre-dispatch quality check, and regional courier dispatch.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-[#faf8f5] p-5 shadow-xs transition hover:border-[#1e3a5f]/40 hover:bg-white hover:shadow-md"
              >
                <div>
                  <span className="text-2xl font-black text-[#1e3a5f]/40">{item.step}</span>
                  <h3 className="mt-3 text-base font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. COMMERCIAL OFFSET PRESS SHOWCASE BANNER */}
      <section className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8 lg:py-16">
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-900 shadow-xl">
          <div className="relative aspect-[16/9] min-h-[360px] w-full sm:min-h-[440px]">
            <Image
              src="/images/commercial-offset-banner.jpg"
              alt="Industrial 4-color commercial offset printing press plant at Mahavir Card"
              fill
              sizes="(max-width: 1440px) 100vw, 1440px"
              className="object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
            <div className="relative z-10 flex h-full max-w-2xl flex-col justify-center px-6 py-10 sm:px-12 sm:py-14">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-md">
                Commercial Plant Capacity
              </span>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
                High-Volume Commercial Printing
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-300 sm:text-lg">
                Need 10,000+ brochures, custom stickers, or bespoke stationery? Our multi-unit offset presses deliver rich ink density, tight registration, and competitive bulk rates for agencies and trade printers.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/quote"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100"
                >
                  Request Bulk Quotation <ArrowRight size={16} />
                </Link>
                <Link
                  href="/products?category=brochure"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-xs transition hover:bg-white/15"
                >
                  View 250 GSM Brochures
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. DYNAMIC MID-PAGE BANNER (Admin Controlled) */}
      <div className="mx-auto max-w-[1440px] px-4 pb-6 lg:px-8">
        <PromotionalBanner placement="HOME_MID" />
      </div>

      {/* 8. QUALITY & TRUST PROOF SECTION */}
      <section className="border-t border-slate-200/80 bg-white py-14 lg:py-18">
        <div className="mx-auto max-w-[1440px] px-4 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">
                Authentic Craftsmanship
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                Printing Standards You Can Rely On
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Operating out of Khadia Golwad, Ahmedabad, Mahavir Card combines commercial offset machinery with thorough pre-press file checks to guarantee reliable results on every run.
              </p>
              <div className="mt-6">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#1e3a5f] hover:underline"
                >
                  Explore products <ArrowRight size={16} />
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/90 bg-[#faf8f5] p-5 shadow-xs">
                <FileCheck2 size={24} className="text-[#1e3a5f]" />
                <h3 className="mt-4 text-sm font-bold text-slate-900">Pre-Press Inspection</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Every CDR file is reviewed for safe bleed, 300 DPI resolution, and correct page ordering before plates are made.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-[#faf8f5] p-5 shadow-xs">
                <PackageCheck size={24} className="text-[#1e3a5f]" />
                <h3 className="mt-4 text-sm font-bold text-slate-900">Tactile Finishes</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Thermal matt, velvet lamination, selective spot UV gloss, and metallic gold foil stamping with crisp corner cuts.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-[#faf8f5] p-5 shadow-xs">
                <MapPin size={24} className="text-[#1e3a5f]" />
                <h3 className="mt-4 text-sm font-bold text-slate-900">Regional Dispatch</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  Insured box packaging dispatched via scheduled couriers across Gujarat and Rajasthan, plus store pickup.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. BULK CALL TO ACTION BAR */}
      <section className="border-t border-slate-200/80 bg-[#1e3a5f] text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Commercial &amp; Trade Printing</p>
            <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Need 10,000 product labels, stickers, or custom stationery?</h2>
            <p className="mt-1 text-sm text-slate-300">Submit your custom dimensions and artwork for a quick quotation.</p>
          </div>
          <Link
            href="/quote"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-[#1e3a5f] shadow-sm transition hover:bg-slate-100"
          >
            Request a Quote <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <StorefrontFooter />
    </main>
  );
}
