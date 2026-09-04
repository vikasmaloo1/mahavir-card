import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, FileUp, PackageCheck, Settings2, ShoppingBag, Truck } from "lucide-react";

import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { CustomerNotices } from "@/components/customer-notices";
import { MarketingBreadcrumb, MarketingCtaBand, MarketingHero } from "@/components/marketing-page";

export const metadata: Metadata = {
  title: "How Ordering Works",
  description: "How to order commercial printing from Mahavir Card — choose a product, configure specs, upload CDR artwork, confirm the order, and track it through to dispatch.",
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How Ordering Works | Mahavir Card",
    description: "Choose a product, configure it, upload artwork, confirm the order, and it goes to print — the full ordering process at Mahavir Card.",
    url: "https://mahavircard.in/how-it-works",
    type: "website",
  },
};

const steps = [
  {
    icon: ShoppingBag,
    step: "01",
    title: "Choose a product",
    body: "Browse visiting cards, brochures, stickers, letterheads, or the full catalog by category. Every listing shows live starting price, size and finish options before you configure anything.",
  },
  {
    icon: Settings2,
    step: "02",
    title: "Configure specifications",
    body: "Set the exact quantity, paper stock, and finish — thermal matt, velvet, spot UV, or foil where available. The price updates live as the configuration changes, with GST shown separately.",
  },
  {
    icon: FileUp,
    step: "03",
    title: "Upload CDR artwork",
    body: "Upload the production-ready CorelDRAW (CDR) file for the job, following the size and safe-bleed requirements shown against that product. Files are checked before production begins.",
  },
  {
    icon: CheckCircle2,
    step: "04",
    title: "Confirm the order",
    body: "Review the itemised price with GST breakdown, choose a payment method — UPI, cash on delivery, Razorpay, or wallet balance for approved business accounts — and confirm.",
  },
  {
    icon: PackageCheck,
    step: "05",
    title: "Print, quality check & dispatch",
    body: "Once artwork passes pre-press review, the job runs on the offset press, gets a pre-dispatch quality check, and is either dispatched by courier or held for pickup at the Ahmedabad facility.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <MarketingBreadcrumb label="How It Works" />
        <MarketingHero
          eyebrow="Streamlined Workflow"
          title="How ordering works"
          description="From choosing a product to dispatch — this is the same five-step process used across every order on Mahavir Card, whether it's a single visiting card run or a bulk commercial job."
          actions={[
            { label: "Start Your Order", href: "/products" },
            { label: "Request a Quote", href: "/quote", variant: "secondary" },
          ]}
        />

        <div className="mt-10 space-y-4">
          {steps.map(({ icon: Icon, step, title, body }) => (
            <div key={step} className="flex gap-5 rounded-2xl border border-[var(--mc-line)] bg-white p-5 sm:p-6">
              <div className="flex shrink-0 flex-col items-center gap-2">
                <span className="grid size-11 place-items-center rounded-full bg-[var(--mc-accent-soft)] text-[var(--mc-accent)]"><Icon size={20} /></span>
                <span className="text-xs font-black text-[var(--mc-accent)]/50">{step}</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-[var(--mc-ink)]">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-6 text-[var(--mc-muted)]">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-[var(--mc-line)] bg-white p-6 sm:p-8">
          <div className="flex items-center gap-2.5">
            <Truck size={22} className="text-[var(--mc-accent)]" />
            <h2 className="text-xl font-bold">Delivery and pickup</h2>
          </div>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[var(--mc-muted)]">
            Orders dispatch by courier across Gujarat and Rajasthan, or can be collected directly from the Khadia Golwad facility in Ahmedabad. Delivery method and pricing
            are shown per product before checkout.
          </p>
        </section>

        <p className="mt-6 text-sm text-[var(--mc-muted)]">
          Need help with your artwork file first?{" "}
          <Link href="/commercial-offset-printing" className="font-bold text-[var(--mc-accent)] hover:underline">Read about commercial offset printing</Link>, or go
          straight to the catalog.
        </p>

        <MarketingCtaBand
          title="Ready to start your order?"
          description="Choose a product and configure it with live pricing in a few clicks."
          primary={{ label: "Start Your Order", href: "/products" }}
        />
      </main>

      <StorefrontFooter />
    </div>
  );
}
