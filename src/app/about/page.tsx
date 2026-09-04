import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, MapPin, Printer } from "lucide-react";

import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { CustomerNotices } from "@/components/customer-notices";
import { MarketingBreadcrumb, MarketingCtaBand, MarketingHero, SectionEyebrow } from "@/components/marketing-page";
import { catalogCategories } from "@/lib/catalog-routing";

export const metadata: Metadata = {
  title: "About Us | Commercial Printing Press in Ahmedabad",
  description: "Mahavir Card is a commercial offset printing press based in Khadia Golwad, Ahmedabad — printing visiting cards, brochures, letterheads and stickers for businesses across Gujarat and Rajasthan.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Mahavir Card | Ahmedabad Printing Press",
    description: "Mahavir Card's Ahmedabad facility prints visiting cards, brochures, letterheads and stickers with online ordering and CDR artwork upload.",
    url: "https://mahavircard.in/about",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <div className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <MarketingBreadcrumb label="About Us" />
        <MarketingHero
          eyebrow="About Mahavir Card"
          title="A commercial printing press in Ahmedabad, Gujarat"
          description="Mahavir Card operates a commercial offset printing press from Khadia Golwad, Ahmedabad, taking orders online for both individual customers and businesses across Gujarat and Rajasthan."
        />

        <section className="mt-10">
          <SectionEyebrow label="Who we are" />
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Who we are</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            Mahavir Card prints visiting cards, brochures, letterheads, envelopes, leaflets and stickers on commercial offset equipment, taking orders directly online with
            live pricing and CDR artwork upload. Both individual (B2C) and business (B2B) customers order through the same catalog, with dedicated wallet/credit
            arrangements available for repeat business accounts.
          </p>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            <em className="not-italic text-[var(--mc-ink)]">Owner note:</em> specific details on how long Mahavir Card has been operating and any background on the business
            can be added here once provided — this section intentionally does not state a history that hasn&apos;t been confirmed.
          </p>
        </section>

        <section className="mt-10">
          <SectionEyebrow label="What we print" />
          <h2 className="mt-3 text-2xl font-bold sm:text-3xl">What we print</h2>
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

        <section className="mt-10 rounded-2xl border border-[var(--mc-line)] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <FileCheck2 size={22} className="text-[var(--mc-accent)]" />
            <h2 className="text-2xl font-bold">Our approach to quality</h2>
          </div>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            Every CDR file submitted is checked for safe bleed, resolution and correct page ordering before plates are made. Finishing options — thermal matt, velvet
            lamination, selective spot UV gloss, and metallic gold foil stamping — are applied with corner-cut precision as part of the standard production process,
            not as a premium add-on.
          </p>
        </section>

        <section className="mt-10 rounded-2xl border border-[var(--mc-line)] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <MapPin size={22} className="text-[var(--mc-accent)]" />
            <h2 className="text-2xl font-bold">Our location</h2>
          </div>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            The press and pickup counter are at Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad – 380001. Orders dispatch by courier to Gujarat and Rajasthan, or can be
            collected directly from the facility.
          </p>
          <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--mc-accent)] hover:underline">
            Get directions and contact details <ArrowRight size={15} />
          </Link>
        </section>

        <section className="mt-10">
          <SectionEyebrow label="Ordering" />
          <div className="flex items-center gap-2.5">
            <Printer size={22} className="text-[var(--mc-accent)]" />
            <h2 className="mt-0 text-2xl font-bold sm:text-3xl">How we work</h2>
          </div>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            Products are configured and priced online, artwork is uploaded directly against each order, and production begins once the CDR file passes pre-press
            checking. <Link href="/how-it-works" className="font-bold text-[var(--mc-accent)] hover:underline">See the full ordering process</Link>, or read about
            <Link href="/commercial-offset-printing" className="font-bold text-[var(--mc-accent)] hover:underline"> commercial offset printing</Link> for bulk and business orders.
          </p>
        </section>

        <MarketingCtaBand
          title="Ready to place an order?"
          description="Browse the full catalog with live pricing, or share a custom requirement for a direct quotation."
          primary={{ label: "Browse Products", href: "/products" }}
          secondary={{ label: "Request a Quote", href: "/quote" }}
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}
