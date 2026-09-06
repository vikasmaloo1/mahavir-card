import type { Metadata } from "next";
import Link from "next/link";

import { getArtworkGuideSpecs } from "@/lib/artwork-guide";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export const metadata: Metadata = {
  title: "Artwork & CDR Guide",
  description: "CorelDRAW (CDR) artwork specifications — accepted formats, dimensions, safe area, and slots — for Mahavir Card products.",
};

const COMMON_MISTAKES = [
  "Submitting PDF, JPG, or PNG files instead of CorelDRAW (.cdr) — only CDR is accepted for print-ready artwork.",
  "Text or important elements placed outside the safe area, risking being trimmed off.",
  "Fonts not converted to curves, causing missing fonts to break the layout at print time.",
  "Missing a required slot (e.g. uploading only the front when back artwork is also required).",
  "Using rich black (mixing all 4 colors) instead of the recommended black mix, causing shade variation.",
];

export default async function ArtworkGuidePage() {
  const specs = await getArtworkGuideSpecs();

  return (
    <div className="min-h-screen bg-[var(--mc-surface)]">
      <StorefrontHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Support</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Artwork &amp; CDR Guide</h1>
        <p className="mt-2 text-[15px] text-[var(--mc-muted)]">Exact artwork specifications, pulled directly from each product&apos;s current requirements.</p>

        <div className="mt-8 space-y-5">
          {specs.map((spec, index) => (
            <section key={index} className="rounded-xl border border-[var(--mc-line)] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--mc-accent)]">{spec.formatLabel} only</p>
              <div className="mt-2 grid gap-2 text-sm text-[var(--mc-muted)] sm:grid-cols-3">
                {spec.fullDesign ? <p><strong className="text-[var(--mc-ink)]">Full design:</strong> {spec.fullDesign}</p> : null}
                {spec.safeArea ? <p><strong className="text-[var(--mc-ink)]">Safe area:</strong> {spec.safeArea}</p> : null}
                {spec.finalSize ? <p><strong className="text-[var(--mc-ink)]">Final size:</strong> {spec.finalSize}</p> : null}
              </div>
              {spec.slots.length ? <p className="mt-3 text-sm text-[var(--mc-muted)]"><strong className="text-[var(--mc-ink)]">Required files:</strong> {spec.slots.join(", ")}</p> : null}
              <p className="mt-3 text-xs text-[var(--mc-muted)]">Used by: {spec.products.slice(0, 6).map((product, productIndex) => (
                <span key={product.slug}>{productIndex > 0 ? ", " : ""}<Link href={`/catalog/${product.slug}`} className="font-semibold text-[var(--mc-accent)] hover:underline">{product.name}</Link></span>
              ))}{spec.products.length > 6 ? ` and ${spec.products.length - 6} more` : ""}</p>
            </section>
          ))}
          {!specs.length ? <p className="text-sm text-[var(--mc-muted)]">No products currently require artwork upload.</p> : null}
        </div>

        <section className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">Common mistakes to avoid</h2>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {COMMON_MISTAKES.map((mistake) => <li key={mistake} className="flex gap-2"><span>•</span><span>{mistake}</span></li>)}
          </ul>
        </section>
      </main>
      <StorefrontFooter />
    </div>
  );
}
