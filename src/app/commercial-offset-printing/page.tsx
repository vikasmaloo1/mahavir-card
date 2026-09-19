import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Layers, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { CustomerNotices } from "@/components/customer-notices";
import { MarketingBreadcrumb, MarketingCtaBand, MarketingHero, SectionEyebrow } from "@/components/marketing-page";
import { ScrollHighlight } from "@/components/scroll-highlight";
import { catalogCategories } from "@/lib/catalog-routing";
import { categoryHref } from "@/lib/seo-categories";

export const metadata: Metadata = {
  title: "Commercial Offset Printing in Ahmedabad, Gujarat",
  description: "Commercial offset printing from Mahavir Card in Ahmedabad — visiting cards, brochures, letterheads, stickers and bulk print jobs with instant online pricing and CDR artwork upload.",
  alternates: {
    canonical: "/commercial-offset-printing",
  },
  openGraph: {
    title: "Commercial Offset Printing in Ahmedabad, Gujarat | Mahavir Card",
    description: "Offset printing for visiting cards, brochures, letterheads and stickers from Mahavir Card's Ahmedabad press facility, with online pricing and bulk quotations.",
    url: "https://mahavircard.in/commercial-offset-printing",
    type: "website",
  },
};

const finishes = [
  { name: "Thermal Matt", note: "Smooth matte lamination on visiting cards" },
  { name: "Velvet Soft-Touch", note: "400 GSM velvet card stock" },
  { name: "Selective Spot UV", note: "Gloss highlight over matte/velvet base" },
  { name: "Metallic Gold Foil", note: "Foil stamping with corner-cut finishing" },
  { name: "250 GSM Art Card", note: "Brochures, leaflets, and art-card jobs" },
  { name: "Alabaster & SS Papers", note: "Letterheads and matching envelopes" },
];

export default function CommercialOffsetPrintingPage() {
  return (
    <div className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <MarketingBreadcrumb label="Commercial Offset Printing" />
        <MarketingHero
          eyebrow="Commercial & Trade Printing"
          title="Commercial Offset Printing in Ahmedabad, Gujarat"
          description="Mahavir Card runs commercial offset print jobs out of its Khadia Golwad facility in Ahmedabad — visiting cards, brochures, letterheads, stickers and bulk stationery, ordered online or quoted directly for custom and volume work."
          actions={[
            { label: "Request a Quote", href: "/quote" },
            { label: "View Products", href: "/products", variant: "secondary" },
          ]}
        />

        <section className="mt-10 rounded-2xl border border-[#d4e4f5] mc-section-blue p-6 sm:p-8">
          <SectionEyebrow label="The basics" />
          <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">What commercial offset printing is</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">
            Offset printing transfers ink from a plate to a rubber blanket, then onto paper — the standard method for consistent color and sharp detail at real print volumes.
            It is the process behind most business cards, brochures, letterheads and commercial stationery, and is what Mahavir Card&apos;s press runs are built on.
          </p>
          <div className="mt-6 border-t border-[#d4e4f5] pt-6">
            <h3 className="text-xl font-bold text-slate-950">When offset printing makes sense</h3>
            <p className="mt-2 max-w-3xl text-[15px] leading-7 text-slate-700">
              Offset is the right choice once you need consistent color across a real print run — visiting cards, brochures, letterheads, and stickers ordered in the quantities
              already listed against each product (starting at 500–1,000 units depending on the item). For a one-off or highly custom job outside the standard catalog, share the
              requirement through a quote and it will be reviewed directly.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xs">
          <SectionEyebrow label="Catalog" />
          <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">On our online catalog</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">
            The categories below are live on the online catalog with instant pricing, and more are being added over time — this is not the full range of what the press
            takes on. Bill books, packing slips, keychains, pens, general stationery, and coaching-institute study material (including work done for institutes such as
            Allen and Bothra Classes) have all been printed directly by quotation.
          </p>
          <ScrollHighlight className="mt-4 max-w-3xl">
            <p className="p-4 text-[15px] font-semibold leading-7 text-[#1e3a5f] sm:p-5">
              Have a specific requirement that isn&apos;t listed?{" "}
              <Link href="/quote" className="font-bold text-[#1e3a5f] underline">Request a quote</Link> or{" "}
              <Link href="/contact" className="font-bold text-[#1e3a5f] underline">send an inquiry</Link> and it&apos;ll be reviewed directly.
            </p>
          </ScrollHighlight>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalogCategories.map((category) => (
              <Link
                key={category.slug}
                href={categoryHref(category.slug)}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-[#faf8f5] px-4 py-3.5 shadow-2xs transition hover:border-[#1e3a5f] hover:bg-white hover:shadow-xs"
              >
                <span className="font-bold text-slate-900 group-hover:text-[#1e3a5f]">{category.name}</span>
                <ArrowRight size={16} className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-[#1e3a5f]" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#ede4d5] mc-section-beige p-6 sm:p-8">
          <SectionEyebrow label="Materials & finishes" />
          <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">Materials and finishes available</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {finishes.map((item) => (
              <div key={item.name} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
                <Check size={17} className="mt-0.5 shrink-0 text-[#1e3a5f]" />
                <div>
                  <p className="font-bold text-slate-950">{item.name}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[#fadcce] mc-section-peach p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <PackageCheck size={22} className="text-[#1e3a5f]" />
            <h2 className="text-2xl font-bold text-slate-950">Bulk and commercial-volume printing</h2>
          </div>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-700">
            For volume orders — product labels, stickers, or custom stationery beyond the standard catalog quantities — share your dimensions and requirement directly and it
            will be quoted for the actual volume, rather than priced against a fixed online rate.
          </p>
          <Link href="/quote" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1e3a5f] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#152a45]">
            Request a bulk quote <ArrowRight size={15} />
          </Link>
        </section>

        <section className="mt-10 rounded-2xl border border-[#e6e0f2] mc-section-lavender p-6 sm:p-8">
          <SectionEyebrow label="Standards & Guarantees" />
          <h2 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">Built for consistent print runs</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <ShieldCheck size={20} className="text-[#1e3a5f]" />
              <p className="mt-3 font-bold text-slate-950">Pre-Press Inspection</p>
              <p className="mt-1 text-sm text-slate-600">Every CDR file is checked for safe bleed, resolution and page ordering before plates are made.</p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <Layers size={20} className="text-[#1e3a5f]" />
              <p className="mt-3 font-bold text-slate-950">Tactile Finishes</p>
              <p className="mt-1 text-sm text-slate-600">Thermal matt, velvet lamination, spot UV gloss, and metallic foil stamping with corner cuts.</p>
            </div>
            <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <Truck size={20} className="text-[#1e3a5f]" />
              <p className="mt-3 font-bold text-slate-950">All-India Dispatch</p>
              <p className="mt-1 text-sm text-slate-600">Insured courier dispatch all over India, plus counter pickup at the Ahmedabad facility.</p>
            </div>
          </div>
        </section>

        <MarketingCtaBand
          title="Ready to place a commercial order?"
          description="Browse live pricing across every category, or share a custom requirement for a direct quotation."
          primary={{ label: "View Products", href: "/products" }}
          secondary={{ label: "Request a Quote", href: "/quote" }}
          tone="mint"
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}
