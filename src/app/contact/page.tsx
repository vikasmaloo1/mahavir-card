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

        <section className="mt-10 rounded-2xl border border-[#ede4d5] mc-section-beige p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">Direct Contact &amp; Counter Pickup</h2>
            <p className="mt-1 text-sm text-slate-700">Connect directly with our printing specialists or visit our Ahmedabad facility.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div className="space-y-4">
              <a
                href="tel:+919426371150"
                className="flex items-start gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-[#1e3a5f] hover:shadow-sm"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]"><Phone size={19} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Call</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-950">+91 94263 71150</p>
                </div>
              </a>

              <a
                href="mailto:mahavircard2011@gmail.com"
                className="flex items-start gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-[#1e3a5f] hover:shadow-sm"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]"><Mail size={19} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</p>
                  <p className="mt-0.5 break-all text-lg font-bold text-slate-950">mahavircard2011@gmail.com</p>
                </div>
              </a>

              <a
                href={whatsAppUrlFor("CONTACT")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-[#1e3a5f] hover:shadow-sm"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]"><MessageCircle size={19} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">WhatsApp</p>
                  <p className="mt-0.5 text-lg font-bold text-slate-950">+91 94263 71150</p>
                </div>
              </a>

              <a
                href={MAPS_DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:border-[#1e3a5f] hover:shadow-sm"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]"><MapPin size={19} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Press facility &amp; pickup counter</p>
                  <p className="mt-0.5 text-[15px] font-semibold leading-6 text-slate-950">{ADDRESS}</p>
                  <p className="mt-1 text-xs font-bold text-[#1e3a5f]">Open in Google Maps</p>
                </div>
              </a>

              <div className="flex items-start gap-4 rounded-xl border border-dashed border-slate-300 bg-white/80 p-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f]"><Clock size={19} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Business hours</p>
                  <p className="mt-0.5 text-sm text-slate-600">Monday to Saturday: 10:00 AM – 8:00 PM</p>
                </div>
              </div>

              <Link
                href="/quote"
                className="flex items-center justify-between rounded-xl bg-[#1e3a5f] px-5 py-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#152a45]"
              >
                Request a quote for a custom or bulk job <ArrowRight size={16} />
              </Link>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
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
        </section>

        <MarketingCtaBand
          title="Ready to place an order instead?"
          description="Browse live pricing across the full catalog and order directly online."
          primary={{ label: "Browse Products", href: "/products" }}
          tone="mint"
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}
