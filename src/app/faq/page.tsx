import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { faqs } from "@/lib/db/schema";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about ordering, artwork, GST/pricing, payment, delivery, B2B accounts, quotes, and reorders at Mahavir Card.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Frequently Asked Questions | Mahavir Card",
    description: "Ordering, artwork, GST/pricing, payment, delivery, B2B, quotes, and reorders — answered from how the system actually works.",
    url: "https://mahavircard.in/faq",
    type: "website",
  },
};

export default async function FaqPage() {
  const rows = await db.select().from(faqs).where(eq(faqs.isActive, true)).orderBy(asc(faqs.category), asc(faqs.sortOrder));
  const categories = [...new Set(rows.map((row) => row.category))];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: rows.map((row) => ({
      "@type": "Question",
      name: row.question,
      acceptedAnswer: { "@type": "Answer", text: row.answer },
    })),
  };

  const categoryTones = [
    "mc-section-blue border-[#d4e4f5]",
    "mc-section-beige border-[#ede4d5]",
    "mc-section-lavender border-[#e6e0f2]",
    "mc-section-peach border-[#fadcce]",
    "mc-section-mint border-[#d2eade]",
  ];

  return (
    <div className="min-h-screen bg-[var(--mc-surface)]">
      <StorefrontHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <div className="rounded-2xl border border-[#d4e4f5] mc-section-blue p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1e3a5f]">Commercial Support</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl">Frequently Asked Questions</h1>
          <p className="mt-2 text-[15px] leading-6 text-slate-700">Ordering, artwork, pricing, payment, delivery, and B2B — answered from how our print production actually works.</p>
        </div>
        {rows.length === 0 ? <p className="mt-6 text-sm text-slate-500">No FAQs published yet.</p> : null}
        <div className="mt-8 space-y-6">
          {categories.map((category, index) => (
            <section key={category} className={`rounded-2xl border p-5 sm:p-7 shadow-xs ${categoryTones[index % categoryTones.length]}`}>
              <h2 className="text-xl font-bold text-slate-950">{category}</h2>
              <div className="mt-4 space-y-3">
                {rows.filter((row) => row.category === category).map((row) => (
                  <details key={row.id} className="group rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs transition hover:border-[#1e3a5f]/40">
                    <summary className="cursor-pointer list-none font-semibold text-slate-900">{row.question}</summary>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{row.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <StorefrontFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
