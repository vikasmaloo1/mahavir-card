import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, FileCheck2, FileUp, MapPin, PackageCheck, Printer, ReceiptText, ShoppingBag } from "lucide-react";

import { HomeCatalogSections } from "@/components/home-catalog-sections";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { CinematicBannerSlideshow } from "@/components/cinematic-banner-slideshow";
import { HomeHeroSlideshow } from "@/components/home-hero-slideshow";
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

      {/* 1. LARGE FULL-WIDTH HERO SLIDESHOW */}
      <HomeHeroSlideshow />

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

      {/* 6. HORIZONTAL CINEMATIC COMMERCIAL BANNER SLIDESHOW */}
      <CinematicBannerSlideshow placement="HOME_MID" />

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
