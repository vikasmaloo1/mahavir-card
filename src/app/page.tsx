import Image from "next/image";
import Link from "next/link";
import { ArrowRight, FileCheck2, FileUp, MapPin, PackageCheck, ReceiptText, ShoppingBag } from "lucide-react";

import { HomeCatalogSections } from "@/components/home-catalog-sections";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { catalogCategories } from "@/lib/catalog";

const localContext = "Ahmedabad \u00b7 Commercial printing \u00b7 Business and bulk orders";
const printServices = "Offset printing \u00b7 Business cards \u00b7 Packaging \u00b7 Labels";

export default function Home() {
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />

      <section className="border-b border-[var(--mc-line)] bg-white">
        <div className="mx-auto grid max-w-[1440px] gap-7 px-4 py-8 lg:grid-cols-[.86fr_1.14fr] lg:items-center lg:px-8 lg:py-11">
          <div className="py-2 lg:pr-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mc-accent)]">Commercial printing {"\u00b7"} Ahmedabad</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-[1.1] sm:text-5xl">Printing that works for your business.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--mc-muted)]">Business cards, packaging, labels and stationery, with online ordering for approved jobs and quotations for custom work.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/products" className="inline-flex items-center gap-2 bg-[var(--mc-accent)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)]">Browse products <ArrowRight size={16} /></Link>
              <Link href="/quote" className="inline-flex items-center gap-2 border border-[var(--mc-line)] bg-[var(--mc-paper)] px-5 py-3 text-sm font-bold text-[var(--mc-ink)] hover:border-[var(--mc-accent)]">Request a quote <ReceiptText size={16} /></Link>
            </div>
            <p className="mt-7 flex items-center gap-2 border-t border-[var(--mc-line)] pt-5 text-xs font-semibold text-[var(--mc-muted)]"><MapPin size={15} className="shrink-0 text-[var(--mc-accent)]" />{localContext}</p>
          </div>

          <div className="relative aspect-[1.55] min-h-[280px] overflow-hidden border border-[#bfd1f3] bg-[var(--mc-accent-soft)] shadow-[0_16px_44px_rgba(40,100,220,0.12)] sm:min-h-[300px]">
            <Image src="/images/mahavir-print-assortment.png" alt="Business cards, printed stationery, packaging and product labels" fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
            <div className="absolute bottom-4 left-4 max-w-[calc(100%-2rem)] border border-white/60 bg-[var(--mc-paper)]/95 px-4 py-3 text-sm font-semibold shadow-sm"><span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mc-accent)]">Ready to order</span>Business cards from Rs 300 / 1,000</div>
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--mc-line)] bg-[var(--mc-paper)]">
        <div className="mx-auto grid max-w-[1440px] gap-5 px-4 py-5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div><p className="font-bold">Mahavir Card</p><p className="mt-1 text-xs text-[var(--mc-muted)]">{printServices}</p></div>
          <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-[var(--mc-accent)]" /><div><p className="text-sm font-bold">Online ordering</p><p className="text-xs text-[var(--mc-muted)]">For approved print jobs</p></div></div>
          <div className="flex items-center gap-3"><FileUp size={18} className="text-[var(--mc-accent)]" /><div><p className="text-sm font-bold">CDR artwork</p><p className="text-xs text-[var(--mc-muted)]">Production-ready upload</p></div></div>
          <div className="flex items-center gap-3"><ReceiptText size={18} className="text-[var(--mc-accent)]" /><div><p className="text-sm font-bold">Custom quotations</p><p className="text-xs text-[var(--mc-muted)]">For complex and bulk work</p></div></div>
        </div>
      </section>

      <HomeCatalogSections initialCategories={catalogCategories} />

      <section className="mx-auto max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[.78fr_1.22fr] lg:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mc-accent)]">A practical print partner</p>
            <h2 className="mt-2 max-w-md text-2xl font-bold sm:text-3xl">Made for businesses in Ahmedabad.</h2>
            <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--mc-muted)]">From everyday visiting cards to bulk packaging and labels, Mahavir Card handles the print work your business depends on.</p>
            <Link href="/products" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--mc-accent)]">Explore the catalogue <ArrowRight size={15} /></Link>
          </div>
          <div className="grid gap-px overflow-hidden border border-[var(--mc-line)] bg-[var(--mc-line)] sm:grid-cols-3">
            {[
              [FileCheck2, "Clear specification", "See quantities, finishes and artwork requirements before ordering."],
              [PackageCheck, "Direct or custom", "Buy priced products online or request a quotation for tailored work."],
              [MapPin, "Local context", "Based in Khadia Golwad and serving practical business print needs."],
            ].map(([Icon, title, copy]) => {
              const ItemIcon = Icon as typeof FileCheck2;
              return <div key={String(title)} className="bg-[var(--mc-paper)] p-5"><ItemIcon size={20} className="text-[var(--mc-accent)]" /><h3 className="mt-5 text-sm font-bold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-[var(--mc-muted)]">{String(copy)}</p></div>;
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--mc-line)] bg-[var(--mc-accent-soft)]">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-5 px-4 py-8 sm:flex-row sm:items-center lg:px-8">
          <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--mc-accent)]">Business and bulk printing</p><h2 className="mt-2 text-2xl font-bold">Need 10,000 labels or custom packaging?</h2></div>
          <Link href="/quote" className="inline-flex w-fit items-center gap-2 bg-[var(--mc-accent)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--mc-accent-dark)]">Request a quote <ArrowRight size={16} /></Link>
        </div>
      </section>

      <StorefrontFooter />
    </main>
  );
}
