import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileUp, PackageCheck, ReceiptText, ShieldCheck, ShoppingBag } from "lucide-react";

import { ProductCard } from "@/components/product-card";
import { StorefrontHeader } from "@/components/storefront-header";
import { catalogCategories, catalogProducts } from "@/lib/catalog";

const promises = [
  { label: "Exact prices", detail: "quoted from approved rate rules, not guesswork" },
  { label: "CDR artwork", detail: "production-ready files handled in house" },
  { label: "Quote help", detail: "a human on the custom and bulk work" },
];

const steps = [
  { icon: ShoppingBag, code: "01", title: "Configure", detail: "Pick the format, stock and quantity." },
  { icon: FileUp, code: "02", title: "Upload", detail: "Send CDR artwork whenever it is ready." },
  { icon: ReceiptText, code: "03", title: "Pay or quote", detail: "Buy outright, or send the brief across." },
  { icon: PackageCheck, code: "04", title: "We print", detail: "Production updates through to delivery." },
];

const pressSwatches = ["var(--mc-cyan)", "var(--mc-magenta)", "var(--mc-yellow)", "var(--mc-ink)"];

/* Trim marks sit in the bleed of a press sheet; here they frame the hero plate. */
function TrimMark({ className }: { className: string }) {
  return <span aria-hidden className={`pointer-events-none absolute size-4 border-[var(--mc-accent)] ${className}`} />;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden border-b border-[var(--mc-line-strong)]">
        <div className="mc-halftone pointer-events-none absolute -right-24 -top-24 size-[420px] opacity-40 [mask-image:radial-gradient(circle,#000,transparent_70%)]" />
        <div className="mc-hairlines pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative mx-auto grid max-w-[1440px] gap-10 px-4 py-12 xl:grid-cols-[1fr_1.04fr] xl:gap-14 xl:px-8 xl:py-20">
          <div className="flex flex-col justify-center">
            <p className="mc-rise mc-ticket flex items-center gap-2.5 text-[var(--mc-accent)]" style={{ "--d": "40ms" } as React.CSSProperties}>
              <span className="mc-reg inline-block size-3" />
              Commercial printing &middot; Ahmedabad
            </p>

            <h1
              className="mc-rise mc-display mt-6 max-w-2xl text-[clamp(2.6rem,6.4vw,4.6rem)] font-semibold leading-[0.98] text-[var(--mc-ink)]"
              style={{ "--d": "120ms" } as React.CSSProperties}
            >
              Print what your
              <br />
              business{" "}
              <span className="relative inline-block italic text-[var(--mc-accent)]">
                actually
                <svg
                  aria-hidden
                  viewBox="0 0 220 14"
                  preserveAspectRatio="none"
                  className="absolute -bottom-1 left-0 h-2.5 w-full text-[var(--mc-accent)]/45"
                >
                  <path d="M2 9C58 3 150 3 218 7" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>{" "}
              needs.
            </h1>

            <p
              className="mc-rise mt-6 max-w-lg text-[17px] leading-7 text-[var(--mc-muted)]"
              style={{ "--d": "200ms" } as React.CSSProperties}
            >
              Cards, packaging, labels and stationery from one practical place. Buy approved print jobs online, or send the
              complicated work over for a quote.
            </p>

            <div className="mc-rise mt-8 flex flex-wrap gap-3" style={{ "--d": "270ms" } as React.CSSProperties}>
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

            <dl
              className="mc-rise mt-10 grid gap-5 border-t border-[var(--mc-line-strong)] pt-6 sm:grid-cols-3"
              style={{ "--d": "340ms" } as React.CSSProperties}
            >
              {promises.map((promise) => (
                <div key={promise.label}>
                  <dt className="mc-display text-[17px] font-semibold text-[var(--mc-ink)]">{promise.label}</dt>
                  <dd className="mt-1 text-[13px] leading-5 text-[var(--mc-muted)]">{promise.detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Hero plate: the image behaves like a printed sheet on the bench. */}
          <div className="mc-press relative" style={{ "--d": "180ms" } as React.CSSProperties}>
            <TrimMark className="-left-2 -top-2 border-l-2 border-t-2" />
            <TrimMark className="-right-2 -top-2 border-r-2 border-t-2" />
            <TrimMark className="-bottom-2 -left-2 border-b-2 border-l-2" />
            <TrimMark className="-bottom-2 -right-2 border-b-2 border-r-2" />

            <div className="relative min-h-[340px] overflow-hidden bg-[#ebe5db] shadow-[0_28px_60px_-32px_rgba(20,32,26,0.55)] sm:min-h-[480px] xl:min-h-[560px]">
              <Image
                src="/images/mahavir-print-assortment.png"
                alt="Business cards, labels, packaging and print material"
                fill
                priority
                sizes="(max-width: 1280px) 100vw, 54vw"
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
      </section>

      {/* --------------------------------------------------------- Category index */}
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

        {/* Reads as a printed contents page: number, name, dot leader, destination. */}
        <ul className="mt-10 border-t border-[var(--mc-line-strong)]">
          {catalogCategories.map((category, index) => (
            <li key={category.slug}>
              <Link
                href={`/catalog?category=${category.slug}`}
                className="group flex items-baseline gap-4 border-b border-[var(--mc-line)] py-5 transition-colors hover:bg-[var(--mc-accent-soft)] sm:gap-6 sm:px-2"
              >
                <span className="mc-ticket mc-nums w-7 shrink-0 text-[var(--mc-faint)] transition-colors group-hover:text-[var(--mc-accent)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mc-display shrink-0 text-[clamp(1.25rem,2.4vw,1.85rem)] font-semibold leading-tight text-[var(--mc-ink)] transition-transform duration-300 group-hover:translate-x-1.5">
                  {category.name}
                </span>
                <span aria-hidden className="hidden min-w-8 flex-1 -translate-y-1 border-b border-dotted border-[var(--mc-line-strong)] sm:block" />
                <span className="hidden max-w-xs text-right text-[13px] leading-5 text-[var(--mc-muted)] lg:block">
                  {category.description}
                </span>
                <ArrowUpRight
                  size={20}
                  className="ml-auto shrink-0 self-center text-[var(--mc-faint)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:text-[var(--mc-accent)] lg:ml-6"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- Popular products */}
      <section className="relative border-y border-[var(--mc-line-strong)] bg-[#f1eee3]">
        <div className="mc-halftone pointer-events-none absolute inset-0 opacity-30 [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]" />
        <div className="relative mx-auto max-w-[1440px] px-4 py-16 xl:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mc-ticket text-[var(--mc-accent)]">Popular products</p>
              <h2 className="mc-display mt-3 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight">
                Choose a product and make it yours.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-[var(--mc-muted)]">
              Online ordering appears wherever an exact price exists. Everything else stays safely on the quote route.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {catalogProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- How it works */}
      <section className="mx-auto max-w-[1440px] px-4 py-16 xl:px-8">
        <div className="grid gap-10 xl:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="mc-ticket text-[var(--mc-accent)]">How it works</p>
            <h2 className="mc-display mt-3 max-w-md text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight">
              A clear route for every kind of print job.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--mc-muted)]">
              Same press, same people, two front doors. Standard work checks out online; anything unusual gets priced by hand.
            </p>
            <Link
              href="/quote"
              className="mc-rule-in relative mt-6 inline-flex items-center gap-2 pb-1 text-sm font-bold text-[var(--mc-accent)]"
            >
              Need a custom job? Request a quote <ArrowRight size={16} />
            </Link>
          </div>

          {/* Four stations, ruled off like a job ticket moving down the floor. */}
          <ol className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ icon: Icon, code, title, detail }) => (
              <li key={code} className="group relative border-t-2 border-[var(--mc-ink)] pt-4">
                <span
                  aria-hidden
                  className="absolute -top-0.5 left-0 h-0.5 w-0 bg-[var(--mc-accent)] transition-all duration-500 group-hover:w-full"
                />
                <div className="flex items-center justify-between">
                  <Icon size={20} className="text-[var(--mc-accent)]" />
                  <span className="mc-ticket mc-nums text-[var(--mc-faint)]">{code}</span>
                </div>
                <h3 className="mc-display mt-8 text-[19px] font-semibold text-[var(--mc-ink)]">{title}</h3>
                <p className="mt-1.5 text-sm leading-5 text-[var(--mc-muted)]">{detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* -------------------------------------------------------------- Bulk band */}
      <section className="relative overflow-hidden border-t border-[var(--mc-line-strong)] bg-[var(--mc-ink)] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-[380px] rounded-full bg-[var(--mc-accent)]/25 blur-3xl"
        />
        <div className="relative mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-4 py-14 sm:flex-row sm:items-center xl:px-8">
          <div>
            <p className="mc-ticket text-[#d99286]">Business and bulk printing</p>
            <h2 className="mc-display mt-3 max-w-xl text-[clamp(1.75rem,3.2vw,2.6rem)] font-semibold leading-tight">
              Need 10,000 labels or custom packaging?
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/65">
              Send the specification across and we will come back with a firm price and a production date.
            </p>
          </div>
          <Link
            href="/quote"
            className="group inline-flex w-fit shrink-0 items-center gap-2.5 bg-[#f5f2ec] px-6 py-4 text-sm font-bold text-[var(--mc-ink)] transition-colors hover:bg-white"
          >
            Request a quote
            <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
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
