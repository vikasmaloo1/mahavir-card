import type { Metadata } from "next";
import Link from "next/link";

import { getArtworkGuideSpecs } from "@/lib/artwork-guide";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export const metadata: Metadata = {
  title: "Artwork & CDR Guide",
  description: "CorelDRAW (CDR) artwork specifications — accepted formats, dimensions, safe area, and slots — for Mahavir Card products.",
  alternates: { canonical: "/artwork-guide" },
  openGraph: {
    title: "Artwork & CDR Guide | Mahavir Card",
    description: "Exact CDR artwork specifications — dimensions, safe area, and required files — pulled from real product requirements.",
    url: "https://mahavircard.in/artwork-guide",
    type: "website",
  },
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
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="rounded-2xl border border-[#d4e4f5] mc-section-blue p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">Pre-Press Support</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Artwork &amp; CDR Guide</h1>
          <p className="mt-2 text-[15px] leading-6 text-slate-700">Exact artwork specifications and bleed tolerances, pulled directly from each product&apos;s current production requirements.</p>
        </div>

        <section className="mt-8 rounded-2xl border border-[#ede4d5] mc-section-beige p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">Production File Specifications</h2>
          <p className="mt-1 text-sm text-slate-700">Adhering to these cut and safe areas guarantees error-free printing on offset machinery.</p>
          <div className="mt-6 space-y-4">
            {specs.map((spec, index) => (
              <div key={index} className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <p className="text-xs font-bold uppercase tracking-wide text-[#1e3a5f]">{spec.formatLabel} only</p>
                <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                  {spec.fullDesign ? <p><strong className="text-slate-900">Full design:</strong> {spec.fullDesign}</p> : null}
                  {spec.safeArea ? <p><strong className="text-slate-900">Safe area:</strong> {spec.safeArea}</p> : null}
                  {spec.finalSize ? <p><strong className="text-slate-900">Final size:</strong> {spec.finalSize}</p> : null}
                </div>
                {spec.slots.length ? <p className="mt-3 text-sm text-slate-600"><strong className="text-slate-900">Required files:</strong> {spec.slots.join(", ")}</p> : null}
                <p className="mt-3 text-xs text-slate-500">Used by: {spec.products.slice(0, 6).map((product, productIndex) => (
                  <span key={product.slug}>{productIndex > 0 ? ", " : ""}<Link href={`/catalog/${product.slug}`} className="font-semibold text-[#1e3a5f] hover:underline">{product.name}</Link></span>
                ))}{spec.products.length > 6 ? ` and ${spec.products.length - 6} more` : ""}</p>
              </div>
            ))}
            {!specs.length ? <p className="text-sm text-slate-500">No products currently require artwork upload.</p> : null}
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-[#fadcce] mc-section-peach p-6 sm:p-8">
          <h2 className="text-xl font-bold text-slate-950">Common mistakes to avoid</h2>
          <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-800">
            {COMMON_MISTAKES.map((mistake) => (
              <li key={mistake} className="flex gap-2">
                <span className="font-bold text-amber-800">•</span>
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <StorefrontFooter />
    </div>
  );
}
