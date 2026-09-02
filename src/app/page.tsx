import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileCheck2, FileUp, MapPin, PackageCheck, ReceiptText, ShoppingBag } from "lucide-react";

import { HomeCatalogSections } from "@/components/home-catalog-sections";
import { CustomerNotices } from "@/components/customer-notices";
import { PromotionalBanner } from "@/components/promotional-banner";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

const localContext = "Ahmedabad, Gujarat \u00b7 Commercial printing \u00b7 Business and bulk orders";
const printServices = "Offset printing \u00b7 Business cards \u00b7 Packaging \u00b7 Labels";

export default function Home() {
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <CustomerNotices placement="HOME" />

      <section className="border-b border-[var(--mc-line)] bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-7 px-4 py-8 lg:grid-cols-[.86fr_1.14fr] lg:items-center lg:px-8 lg:py-11">
          <div className="py-2 lg:pr-6">
            <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Commercial printing {"\u00b7"} Ahmedabad, Gujarat</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-[1.1] sm:text-5xl">Printing that works for your business.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--mc-muted)]">Business cards, packaging, labels and stationery, with online ordering for approved jobs and quotations for custom work.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center gap-2 bg-[var(--mc-accent)] px-6 py-3.5 text-[15px] font-bold text-white hover:bg-[var(--mc-accent-dark)]">Browse products <ArrowRight size={17} /></Link>
              <Link href="/quote" className="inline-flex items-center gap-2 border border-[var(--mc-line)] bg-[var(--mc-paper)] px-6 py-3.5 text-[15px] font-bold text-[var(--mc-ink)] hover:border-[var(--mc-accent)]">Request a quote <ReceiptText size={17} /></Link>
            </div>
            <p className="mt-7 inline-flex max-w-full items-center gap-2 rounded-full border border-[#c7d7f3] bg-[var(--mc-accent-soft)] px-4 py-3 text-sm font-semibold leading-5 text-[var(--mc-muted)]"><MapPin size={17} className="shrink-0 text-[var(--mc-accent)]" />{localContext}</p>
          </div>

          <div className="relative aspect-[1.55] min-h-[280px] overflow-hidden border border-[#bfd1f3] bg-[var(--mc-accent-soft)] shadow-[0_16px_44px_rgba(40,100,220,0.12)] sm:min-h-[300px]">
            <Image src="/images/mahavir-print-assortment.png" alt="Business cards, printed stationery, packaging and product labels" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
            <div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] rounded-lg border border-white/70 bg-[var(--mc-paper)]/95 px-4 py-3 text-[15px] font-semibold shadow-sm"><span className="mb-1 block text-xs font-bold uppercase text-[var(--mc-accent)]">Ready to order</span>Live prices {"\u00b7"} Online configuration {"\u00b7"} Custom quotes</div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-[1440px] px-4 pt-8 lg:px-8">
        <PromotionalBanner placement="HOME_HERO_BOTTOM" />
      </div>

      <section className="border-b border-[var(--mc-line)] bg-[var(--mc-paper)] mt-8">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div><p className="text-lg font-bold">Mahavir Card</p><p className="mt-1 text-sm leading-5 text-[var(--mc-muted)]">{printServices}</p></div>
          <div className="flex items-center gap-3"><ShoppingBag size={20} className="text-[var(--mc-accent)]" /><div><p className="text-[15px] font-bold">Online ordering</p><p className="mt-0.5 text-sm text-[var(--mc-muted)]">For approved print jobs</p></div></div>
          <div className="flex items-center gap-3"><FileUp size={20} className="text-[var(--mc-accent)]" /><div><p className="text-[15px] font-bold">CDR artwork</p><p className="mt-0.5 text-sm text-[var(--mc-muted)]">Product-specific upload rules</p></div></div>
          <div className="flex items-center gap-3"><ReceiptText size={20} className="text-[var(--mc-accent)]" /><div><p className="text-[15px] font-bold">Custom quotations</p><p className="mt-0.5 text-sm text-[var(--mc-muted)]">For complex and bulk work</p></div></div>
        </div>
      </section>

      <HomeCatalogSections initialCategories={[]} />

      <div className="mx-auto max-w-[1440px] px-4 py-4 lg:px-8">
        <PromotionalBanner placement="HOME_MID" />
      </div>

      <section className="mx-auto max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">A practical print partner</p>
            <h2 className="mt-2 max-w-md text-2xl font-bold sm:text-3xl">Made for businesses in Ahmedabad, Gujarat.</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--mc-muted)]">From everyday visiting cards to bulk packaging and labels, Mahavir Card handles the print work your business depends on.</p>
            <Link href="/products" className="mt-5 inline-flex items-center gap-2 text-[15px] font-bold text-[var(--mc-accent)]">Explore the catalogue <ArrowRight size={17} /></Link>
          </div>
          <div className="grid gap-px overflow-hidden border border-[var(--mc-line)] bg-[var(--mc-line)] sm:grid-cols-3">
            {[
              [FileCheck2, "Clear specification", "See quantities, finishes and artwork requirements before ordering."],
              [PackageCheck, "Direct or custom", "Buy priced products online or request a quotation for tailored work."],
              [MapPin, "Local context", "Based in Khadia Golwad and serving practical business print needs."],
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as typeof FileCheck2;
              return <div key={String(title)} className="bg-[var(--mc-paper)] p-6"><ItemIcon size={22} className="text-[var(--mc-accent)]" /><h3 className="mt-5 text-base font-bold">{String(title)}</h3><p className="mt-2 text-[15px] leading-6 text-[var(--mc-muted)]">{String(copy)}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--mc-line)] bg-[var(--mc-accent-soft)]">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 px-4 py-8 sm:flex-row sm:items-center lg:px-8">
          <div><p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Business and bulk printing</p><h2 className="mt-2 text-2xl font-bold">Need 10,000 labels or custom packaging?</h2></div>
          <Link href="/quote" className="inline-flex w-fit items-center gap-2 bg-[var(--mc-accent)] px-6 py-3.5 text-[15px] font-bold text-white hover:bg-[var(--mc-accent-dark)]">Request a quote <ArrowRight size={17} /></Link>
        </div>
      </section>

      <StorefrontFooter />
    </main>
  );
}
