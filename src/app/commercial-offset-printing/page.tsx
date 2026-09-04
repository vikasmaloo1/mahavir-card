import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Layers, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { CustomerNotices } from "@/components/customer-notices";
import { MarketingBreadcrumb, MarketingCtaBand, MarketingHero, SectionEyebrow } from "@/components/marketing-page";
import { catalogCategories } from "@/lib/catalog-routing";

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
        />

        <section className="mt-10">
          <SectionEyebrow label="The basics" />
          <h2 className="mt-3 text-2xl font-bold text-[var(--mc-ink)] sm:text-3xl">What commercial offset printing is</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            Offset printing transfers ink from a plate to a rubber blanket, then onto paper — the standard method for consistent color and sharp detail at real print volumes.
            It is the process behind most business cards, brochures, letterheads and commercial stationery, and is what Mahavir Card&apos;s press runs are built on.
          </p>
        </section>

        <section className="mt-10">
          <SectionEyebrow label="When to choose it" />
          <h2 className="mt-3 text-2xl font-bold text-[var(--mc-ink)] sm:text-3xl">When offset printing makes sense</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            Offset is the right choice once you need consistent color across a real print run — visiting cards, brochures, letterheads, and stickers ordered in the quantities
            already listed against each product (starting at 500–1,000 units depending on the item). For a one-off or highly custom job outside the standard catalog, share the
            requirement through a quote and it will be reviewed directly.
          </p>
        </section>

        <section className="mt-10">
          <SectionEyebrow label="Catalog" />
          <h2 className="mt-3 text-2xl font-bold text-[var(--mc-ink)] sm:text-3xl">Products printed on this press</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {catalogCategories.map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className="group flex items-center justify-between rounded-xl border border-[var(--mc-line)] bg-white px-4 py-3.5 shadow-xs transition hover:border-[var(--mc-accent)] hover:shadow-sm"
              >
                <span className="font-bold text-[var(--mc-ink)] group-hover:text-[var(--mc-accent)]">{category.name}</span>
                <ArrowRight size={16} className="shrink-0 text-[var(--mc-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--mc-accent)]" />
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <SectionEyebrow label="Materials & finishes" />
          <h2 className="mt-3 text-2xl font-bold text-[var(--mc-ink)] sm:text-3xl">Materials and finishes available</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {finishes.map((item) => (
              <div key={item.name} className="flex items-start gap-3 rounded-xl border border-[var(--mc-line)] bg-white p-4">
                <Check size={17} className="mt-0.5 shrink-0 text-[var(--mc-accent)]" />
                <div>
                  <p className="font-bold text-[var(--mc-ink)]">{item.name}</p>
                  <p className="mt-0.5 text-sm text-[var(--mc-muted)]">{item.note}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[var(--mc-line)] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <PackageCheck size={22} className="text-[var(--mc-accent)]" />
            <h2 className="text-2xl font-bold text-[var(--mc-ink)]">Bulk and commercial-volume printing</h2>
          </div>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            For volume orders — product labels, stickers, or custom stationery beyond the standard catalog quantities — share your dimensions and requirement directly and it
            will be quoted for the actual volume, rather than priced against a fixed online rate.
          </p>
          <Link href="/quote" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--mc-accent)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--mc-accent-dark)]">
            Request a bulk quote <ArrowRight size={15} />
          </Link>
        </section>

        <section className="mt-10">
          <SectionEyebrow label="Process" />
          <h2 className="mt-3 text-2xl font-bold text-[var(--mc-ink)] sm:text-3xl">How ordering works</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            Choose a product, configure the quantity and finish, upload production-ready CDR artwork, and confirm the order with live GST-inclusive pricing —
            <Link href="/how-it-works" className="font-bold text-[var(--mc-accent)] hover:underline"> the full process is explained step by step here</Link>.
          </p>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--mc-line)] bg-white p-5">
            <ShieldCheck size={20} className="text-[var(--mc-accent)]" />
            <p className="mt-3 font-bold text-[var(--mc-ink)]">Pre-Press Inspection</p>
            <p className="mt-1 text-sm text-[var(--mc-muted)]">Every CDR file is checked for safe bleed, resolution and page ordering before plates are made.</p>
          </div>
          <div className="rounded-xl border border-[var(--mc-line)] bg-white p-5">
            <Layers size={20} className="text-[var(--mc-accent)]" />
            <p className="mt-3 font-bold text-[var(--mc-ink)]">Tactile Finishes</p>
            <p className="mt-1 text-sm text-[var(--mc-muted)]">Thermal matt, velvet lamination, spot UV gloss, and metallic foil stamping with corner cuts.</p>
          </div>
          <div className="rounded-xl border border-[var(--mc-line)] bg-white p-5">
            <Truck size={20} className="text-[var(--mc-accent)]" />
            <p className="mt-3 font-bold text-[var(--mc-ink)]">Regional Dispatch</p>
            <p className="mt-1 text-sm text-[var(--mc-muted)]">Insured courier dispatch across Gujarat and Rajasthan, plus counter pickup at the Ahmedabad facility.</p>
          </div>
        </section>

        <MarketingCtaBand
          title="Ready to place a commercial order?"
          description="Browse live pricing across every category, or share a custom requirement for a direct quotation."
          primary={{ label: "View Products", href: "/products" }}
          secondary={{ label: "Request a Quote", href: "/quote" }}
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}
