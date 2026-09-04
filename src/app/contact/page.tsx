import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { CustomerNotices } from "@/components/customer-notices";
import { MarketingBreadcrumb, MarketingCtaBand, MarketingHero } from "@/components/marketing-page";
import { whatsAppUrlFor } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Contact Us | Printing Press in Ahmedabad, Gujarat",
  description: "Contact Mahavir Card's Ahmedabad printing press — address, phone, email and WhatsApp for orders, bulk quotations and support.",
  alternates: {
    canonical: "/contact",
  },
  openGraph: {
    title: "Contact Mahavir Card | Ahmedabad, Gujarat",
    description: "Get in touch with Mahavir Card's Ahmedabad printing press for orders, bulk quotations and support.",
    url: "https://mahavircard.in/contact",
    type: "website",
  },
};

const ADDRESS = "Khadia Golwad, Opp. Jain Digamber Mandir, Ahmedabad - 380001";
const LATITUDE = 23.0232;
const LONGITUDE = 72.5925;
const MAP_EMBED_SRC = `https://www.google.com/maps?q=${LATITUDE},${LONGITUDE}&output=embed`;
const MAPS_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${LATITUDE},${LONGITUDE}`;

export default function ContactPage() {
  return (
    <div className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <MarketingBreadcrumb label="Contact" />
        <MarketingHero
          eyebrow="Contact Mahavir Card"
          title="Get in touch"
          description="For order support, artwork questions, or a bulk/commercial quotation, reach the Ahmedabad facility directly."
          actions={[{ label: "Request a Quote", href: "/quote" }]}
        />

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="space-y-4">
            <a
              href="tel:+919426371150"
              className="flex items-start gap-4 rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-xs transition hover:border-[var(--mc-accent)] hover:shadow-sm"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><Phone size={19} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--mc-muted)]">Call</p>
                <p className="mt-0.5 text-lg font-bold text-[var(--mc-ink)]">+91 94263 71150</p>
              </div>
            </a>

            <a
              href="mailto:mahavircard2011@gmail.com"
              className="flex items-start gap-4 rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-xs transition hover:border-[var(--mc-accent)] hover:shadow-sm"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><Mail size={19} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--mc-muted)]">Email</p>
                <p className="mt-0.5 break-all text-lg font-bold text-[var(--mc-ink)]">mahavircard2011@gmail.com</p>
              </div>
            </a>

            <a
              href={whatsAppUrlFor("CONTACT")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-xs transition hover:border-[var(--mc-accent)] hover:shadow-sm"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><MessageCircle size={19} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--mc-muted)]">WhatsApp</p>
                <p className="mt-0.5 text-lg font-bold text-[var(--mc-ink)]">+91 94263 71150</p>
              </div>
            </a>

            <a
              href={MAPS_DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-xs transition hover:border-[var(--mc-accent)] hover:shadow-sm"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><MapPin size={19} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--mc-muted)]">Press facility &amp; pickup counter</p>
                <p className="mt-0.5 text-[15px] font-semibold leading-6 text-[var(--mc-ink)]">{ADDRESS}</p>
                <p className="mt-1 text-xs font-bold text-[var(--mc-accent)]">Open in Google Maps</p>
              </div>
            </a>

            <div className="flex items-start gap-4 rounded-xl border border-dashed border-[var(--mc-line)] bg-white p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><Clock size={19} /></span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[var(--mc-muted)]">Business hours</p>
                <p className="mt-0.5 text-sm text-[var(--mc-muted)]">Owner note: confirm exact hours to display here.</p>
              </div>
            </div>

            <Link
              href="/quote"
              className="flex items-center justify-between rounded-xl bg-[var(--mc-accent)] px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--mc-accent-dark)]"
            >
              Request a quote for a custom or bulk job <ArrowRight size={16} />
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl border border-[var(--mc-line)] shadow-xs">
            <iframe
              title="Mahavir Card location"
              src={MAP_EMBED_SRC}
              className="h-[420px] w-full lg:h-full"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        <MarketingCtaBand
          title="Ready to place an order instead?"
          description="Browse live pricing across the full catalog and order directly online."
          primary={{ label: "Browse Products", href: "/products" }}
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}
