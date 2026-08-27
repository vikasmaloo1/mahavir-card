import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileUp, PackageCheck, ReceiptText, ShieldCheck, ShoppingBag } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { StorefrontHeader } from "@/components/storefront-header";
import { catalogCategories, catalogProducts } from "@/lib/catalog";

/* The masthead dock: the marginalia a press operator writes on a running sheet. */
const dockEntries = [
  ["Job", "Storefront / Ed. 01"],
  ["Plant", "Ahmedabad"],
  ["Press", "Offset & digital"],
  ["Turnaround", "2-10 working days"],
];

const ledger = [
  { figure: "Exact", label: "Prices", detail: "Quoted from approved rate rules, never guesswork." },
  { figure: "CDR", label: "Artwork", detail: "Production-ready files handled in house." },
  { figure: "1:1", label: "Quote help", detail: "A human on the custom and bulk work." },
  { figure: "6", label: "Categories", detail: "Cards through packaging, one supplier." },
];

const steps = [
  { icon: ShoppingBag, code: "01", title: "Configure", detail: "Pick the format, stock and quantity. The price updates as you go." },
  { icon: FileUp, code: "02", title: "Upload", detail: "Send CDR artwork whenever it is ready, before or after ordering." },
  { icon: ReceiptText, code: "03", title: "Pay or quote", detail: "Buy outright when a price exists, or send the brief across." },
  { icon: PackageCheck, code: "04", title: "We print", detail: "Proof, press, finish and dispatch, with updates throughout." },
];

const pressSwatches = ["var(--mc-cyan)", "var(--mc-magenta)", "var(--mc-yellow)", "var(--mc-ink)"];

/* Trim marks sit in the bleed of a press sheet; here they frame the hero plate. */
function TrimMark({ className }: { className: string }) {
  return <span aria-hidden className={`pointer-events-none absolute size-4 border-[var(--mc-accent)] ${className}`} />;
}

export default function Home() {
  const [leadCategory, ...restCategories] = catalogCategories;

  return (
    <main className="min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />

      {/* --------------------------------------------------------- Masthead hero */}
      <section className="relative overflow-hidden border-b border-[var(--mc-line-strong)]">
        <div className="mc-hairlines pointer-events-none absolute inset-0 opacity-50" />
        <div className="mc-halftone pointer-events-none absolute -left-32 bottom-0 size-[480px] opacity-30 [mask-image:radial-gradient(circle,#000,transparent_70%)]" />

        <div className="relative mx-auto max-w-[1440px] px-4 pb-14 pt-10 xl:px-8 xl:pb-20 xl:pt-14">
          {/* Dock rail across the head of the sheet. */}
          <dl
            className="mc-rise grid grid-cols-2 gap-y-4 border-y border-[var(--mc-line-strong)] py-3 sm:grid-cols-4"
            style={{ "--d": "20ms" } as React.CSSProperties}
          >
            {dockEntries.map(([term, value]) => (
              <div key={term} className="flex items-baseline gap-2.5">
                <dt className="mc-ticket text-[var(--mc-faint)]">{term}</dt>
                <dd className="mc-nums text-[13px] font-medium text-[var(--mc-ink-soft)]">{value}</dd>
              </div>
            ))}
          </dl>

          {/* The headline runs the full measure, the way a broadsheet sets its lead. */}
          <h1
            className="mc-rise mc-display mt-10 text-[clamp(2.9rem,8.4vw,7.4rem)] font-semibold leading-[0.92]"
            style={{ "--d": "110ms" } as React.CSSProperties}
          >
            Print what your business{" "}
            <span className="relative inline-block italic text-[var(--mc-accent)]">
              actually
              <svg
                aria-hidden
                viewBox="0 0 220 14"
                preserveAspectRatio="none"
                className="absolute -bottom-1 left-0 h-[0.14em] w-full text-[var(--mc-accent)]/45"
              >
                <path d="M2 9C58 3 150 3 218 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </span>{" "}
            needs.
          </h1>

          <div className="mt-9 grid gap-8 border-t border-[var(--mc-line-strong)] pt-8 xl:grid-cols-[1.05fr_0.95fr] xl:gap-14">
            <div className="mc-rise flex flex-col" style={{ "--d": "190ms" } as React.CSSProperties}>
              <p className="mc-ticket flex items-center gap-2.5 text-[var(--mc-accent)]">
                <span className="mc-reg inline-block size-3" />
                Commercial printing &middot; Ahmedabad
              </p>
              <p className="mt-5 max-w-xl text-[17px] leading-7 text-[var(--mc-muted)]">
                Cards, packaging, labels and stationery from one practical place. Buy approved print jobs online at a price
                you can see, or send the complicated work over and we will price it by hand.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/catalog"
                  className="mc-wipe group inline-flex items-center gap-2.5 border border-[var(--mc-accent)] bg-[var(--mc-accent)] px-6 py-3.5 text-sm font-bold text-white transition-colors duration-300 hover:border-[var(--mc-ink)]"
                >
                  Browse products
                  <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/quote"
                  className="mc-wipe group inline-flex items-center gap-2.5 border border-[var(--mc-line-strong)] bg-[var(--mc-paper)] px-6 py-3.5 text-sm font-bold text-[var(--mc-ink)] transition-colors duration-300 hover:border-[var(--mc-ink)] hover:text-white"
                >
                  Get a quote <ReceiptText size={16} />
                </Link>
              </div>
            </div>

            {/* Hero plate: the image behaves like a printed sheet on the bench. */}
            <div className="mc-press relative" style={{ "--d": "160ms" } as React.CSSProperties}>
              <TrimMark className="-left-2 -top-2 border-l-2 border-t-2" />
              <TrimMark className="-right-2 -top-2 border-r-2 border-t-2" />
              <TrimMark className="-bottom-2 -left-2 border-b-2 border-l-2" />
              <TrimMark className="-bottom-2 -right-2 border-b-2 border-r-2" />

              <div className="relative min-h-[300px] overflow-hidden bg-[#ebe5db] shadow-[0_28px_60px_-32px_rgba(20,32,26,0.55)] sm:min-h-[380px] xl:min-h-[420px]">
                <Image
                  src="/images/mahavir-print-assortment.png"
                  alt="Business cards, labels, packaging and print material"
                  fill
                  priority
                  sizes="(max-width: 1280px) 100vw, 48vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--mc-ink)]/45 via-transparent to-transparent" />
              </div>

              {/* Docket card, deliberately breaking the plate edge. */}
              <div className="absolute -bottom-5 left-4 border border-[var(--mc-line-strong)] bg-[var(--mc-surface)] px-5 py-4 shadow-[0_18px_36px_-20px_rgba(20,32,26,0.5)] sm:left-6">
                <span className="mc-ticket block text-[var(--mc-faint)]">Ready to order</span>
                <p className="mc-nums mt-2 text-base font-bold text-[var(--mc-ink)]">Business cards from Rs 300 / 1,000</p>
              </div>

              <div className="absolute -right-3 top-6 hidden flex-col gap-1 sm:flex">
                {pressSwatches.map((swatch) => (
                  <span key={swatch} className="block size-6 border border-white/40" style={{ background: swatch }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Ledger row */}
      <section className="border-b border-[var(--mc-line-strong)] bg-[var(--mc-paper)]">
        <dl className="mx-auto grid max-w-[1440px] grid-cols-2 px-4 xl:grid-cols-4 xl:px-8">
          {ledger.map((entry, index) => (
            <div
              key={entry.label}
              className={`border-[var(--mc-line)] py-7 pr-5 ${index % 2 === 1 ? "border-l pl-5" : ""} ${
                index < 2 ? "border-b xl:border-b-0" : ""
              } xl:border-l xl:pl-5 ${index === 0 ? "xl:border-l-0 xl:pl-0" : ""}`}
            >
              <dt className="mc-display text-[clamp(1.6rem,2.6vw,2.1rem)] font-semibold leading-none text-[var(--mc-accent)]">
                {entry.figure}
              </dt>
              <dd>
                <span className="mc-ticket mt-3 block text-[var(--mc-ink-soft)]">{entry.label}</span>
                <span className="mt-2 block max-w-[26ch] text-[13px] leading-5 text-[var(--mc-muted)]">{entry.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* -------------------------------------------------------- Imposition grid */}
      <section className="mx-auto max-w-[1440px] px-4 py-16 xl:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mc-ticket text-[var(--mc-accent)]">Popular categories</p>
            <h2 className="mc-display mt-3 max-w-lg text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight">
              Start with the job, not the jargon.
            </h2>
          </div>
          <Link
            href="/catalog"
            className="mc-rule-in relative inline-flex items-center gap-1.5 pb-1 text-sm font-bold text-[var(--mc-accent)]"
          >
            See the full catalogue <ArrowRight size={15} />
          </Link>
        </div>

        {/* Laid out like an imposition sheet: one large form, the rest ganged up beside it. */}
        <div className="mt-10 grid gap-px bg-[var(--mc-line-strong)] sm:grid-cols-2 xl:grid-cols-3">
          <Link
            href={`/catalog?category=${leadCategory.slug}`}
            className="group relative flex min-h-[260px] flex-col justify-between overflow-hidden bg-[var(--mc-ink)] p-6 text-white transition-colors duration-300 hover:bg-[var(--mc-accent)] sm:col-span-2 xl:row-span-2 xl:min-h-[420px]"
          >
            <div
              aria-hidden
              className="mc-halftone pointer-events-none absolute inset-0 opacity-15 [mask-image:linear-gradient(to_top,#000,transparent_60%)]"
            />
            <div className="relative flex items-start justify-between">
              <span className="mc-ticket mc-nums text-white/50">01</span>
              <ArrowUpRight
                size={22}
                className="text-white/60 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-white"
              />
            </div>
            <div className="relative">
              <h3 className="mc-display text-[clamp(2rem,3.6vw,3rem)] font-semibold leading-none">{leadCategory.name}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">{leadCategory.description}</p>
              <div className="mt-6 flex gap-1" aria-hidden>
                {pressSwatches.slice(0, 3).map((swatch) => (
                  <span key={swatch} className="block size-3" style={{ background: swatch }} />
                ))}
              </div>
            </div>
          </Link>

          {restCategories.map((category, index) => (
            <Link
              key={category.slug}
              href={`/catalog?category=${category.slug}`}
              className="group flex min-h-[190px] flex-col justify-between bg-[var(--mc-paper)] p-6 transition-colors duration-300 hover:bg-[var(--mc-accent-soft)]"
            >
              <div className="flex items-start justify-between">
                <span className="mc-ticket mc-nums text-[var(--mc-faint)] transition-colors group-hover:text-[var(--mc-accent)]">
                  {String(index + 2).padStart(2, "0")}
                </span>
                <ArrowUpRight
                  size={19}
                  className="text-[var(--mc-faint)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-[var(--mc-accent)]"
                />
              </div>
              <div>
                <h3 className="mc-display text-[clamp(1.3rem,2vw,1.7rem)] font-semibold leading-tight text-[var(--mc-ink)] transition-transform duration-300 group-hover:translate-x-1">
                  {category.name}
                </h3>
                <p className="mt-2 text-[13px] leading-5 text-[var(--mc-muted)]">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- Popular products */}
      <section className="relative border-y border-[var(--mc-line-strong)] bg-[#f1eee3]">
        <div className="mc-halftone pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]" />
        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-4 py-16 xl:grid-cols-[0.75fr_2.25fr] xl:px-8">
          {/* The section title rides along as the sheets scroll past. */}
          <div className="xl:sticky xl:top-[150px] xl:h-fit">
            <p className="mc-ticket text-[var(--mc-accent)]">Popular products</p>
            <h2 className="mc-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight">
              Choose a product and make it yours.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--mc-muted)]">
              Online ordering appears wherever an exact price exists. Everything else stays safely on the quote route.
            </p>
            <Link
              href="/catalog"
              className="mc-rule-in relative mt-6 inline-flex items-center gap-1.5 pb-1 text-sm font-bold text-[var(--mc-accent)]"
            >
              All products <ArrowRight size={15} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {catalogProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- How it works */}
      <section className="mx-auto max-w-[1440px] px-4 py-16 xl:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mc-ticket text-[var(--mc-accent)]">How it works</p>
            <h2 className="mc-display mt-3 max-w-md text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight">
              A clear route for every kind of print job.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-[var(--mc-muted)]">
            Same press, same people, two front doors. Standard work checks out online; anything unusual gets priced by hand.
          </p>
        </div>

        {/* A job ticket travelling down the floor, one station per rule. */}
        <ol className="mt-10 border-t border-[var(--mc-line-strong)]">
          {steps.map(({ icon: Icon, code, title, detail }) => (
            <li
              key={code}
              className="group grid items-baseline gap-x-6 gap-y-2 border-b border-[var(--mc-line)] py-6 transition-colors hover:bg-[var(--mc-accent-soft)] sm:grid-cols-[auto_minmax(0,14rem)_1fr_auto] sm:px-2"
            >
              <span className="mc-ticket mc-nums text-[var(--mc-faint)] transition-colors group-hover:text-[var(--mc-accent)]">
                {code}
              </span>
              <h3 className="mc-display text-[clamp(1.35rem,2.2vw,1.85rem)] font-semibold leading-tight text-[var(--mc-ink)] transition-transform duration-300 group-hover:translate-x-1.5">
                {title}
              </h3>
              <p className="max-w-lg text-sm leading-6 text-[var(--mc-muted)]">{detail}</p>
              <Icon
                size={20}
                className="hidden self-center text-[var(--mc-faint)] transition-colors group-hover:text-[var(--mc-accent)] sm:block"
              />
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------- Two doors */}
      <section className="relative overflow-hidden border-t border-[var(--mc-line-strong)] bg-[var(--mc-ink)] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-[380px] rounded-full bg-[var(--mc-accent)]/25 blur-3xl"
        />
        <div className="relative mx-auto max-w-[1440px] px-4 py-16 xl:px-8">
          <div className="grid gap-px bg-white/15 md:grid-cols-2">
            <div className="flex flex-col justify-between gap-8 bg-[var(--mc-ink)] p-8 xl:p-10">
              <div>
                <p className="mc-ticket text-[#d99286]">Buy online</p>
                <h2 className="mc-display mt-4 max-w-sm text-[clamp(1.6rem,2.8vw,2.3rem)] font-semibold leading-tight">
                  Approved jobs, priced on the page.
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
                  Configure the stock and quantity, see the exact amount, and check out without waiting on a reply.
                </p>
              </div>
              <Link
                href="/catalog"
                className="group inline-flex w-fit items-center gap-2.5 border border-white/25 px-6 py-4 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white hover:text-[var(--mc-ink)]"
              >
                Browse products
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="flex flex-col justify-between gap-8 bg-[var(--mc-ink)] p-8 xl:p-10">
              <div>
                <p className="mc-ticket text-[#d99286]">Business and bulk printing</p>
                <h2 className="mc-display mt-4 max-w-sm text-[clamp(1.6rem,2.8vw,2.3rem)] font-semibold leading-tight">
                  Need 10,000 labels or custom packaging?
                </h2>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">
                  Send the specification across and we will come back with a firm price and a production date.
                </p>
              </div>
              <Link
                href="/quote"
                className="group inline-flex w-fit items-center gap-2.5 bg-[#f5f2ec] px-6 py-4 text-sm font-bold text-[var(--mc-ink)] transition-colors hover:bg-white"
              >
                Request a quote
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- Footer */}
      <footer className="bg-[var(--mc-ink)] text-[#b9c1ba]">
        <div className="mx-auto grid max-w-[1440px] gap-8 border-t border-white/10 px-4 py-12 sm:grid-cols-2 xl:grid-cols-4 xl:px-8">
          <div>
            <p className="mc-display text-lg font-semibold text-white">Mahavir Card</p>
            <p className="mt-3 max-w-xs text-sm leading-6 text-white/60">
              Clear print ordering for growing businesses. Cards, packaging, labels, stationery and signage.
            </p>
          </div>
          <div>
            <p className="mc-ticket text-white/40">Catalogue</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {catalogCategories.slice(0, 4).map((category) => (
                <li key={category.slug}>
                  <Link href={`/catalog?category=${category.slug}`} className="transition-colors hover:text-white">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mc-ticket text-white/40">Ordering</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/catalog" className="transition-colors hover:text-white">All products</Link></li>
              <li><Link href="/quote" className="transition-colors hover:text-white">Request a quote</Link></li>
              <li><Link href="/cart" className="transition-colors hover:text-white">Purchase basket</Link></li>
              <li><Link href="/account" className="transition-colors hover:text-white">Your orders</Link></li>
            </ul>
          </div>
          <div>
            <p className="mc-ticket text-white/40">Press check</p>
            <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-white/60">
              <ShieldCheck size={16} className="mt-1 shrink-0 text-[#d99286]" />
              Every job is proofed before it goes on the press, and priced from approved rate rules.
            </p>
          </div>
        </div>

        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-5 xl:px-8">
          <p className="mc-ticket text-white/35">&copy; {new Date().getFullYear()} Mahavir Card &middot; Ahmedabad</p>
          <div className="flex gap-1" aria-hidden>
            {["var(--mc-cyan)", "var(--mc-magenta)", "var(--mc-yellow)", "#ffffff"].map((swatch) => (
              <span key={swatch} className="block size-3" style={{ background: swatch }} />
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
