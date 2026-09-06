import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { faqs } from "@/lib/db/schema";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers about ordering, artwork, GST/pricing, payment, delivery, B2B accounts, quotes, and reorders at Mahavir Card.",
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

  return (
    <div className="min-h-screen bg-[var(--mc-surface)]">
      <StorefrontHeader />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
        <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Support</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Frequently Asked Questions</h1>
        <p className="mt-2 text-[15px] text-[var(--mc-muted)]">Ordering, artwork, pricing, payment, delivery, and B2B — answered from how the system actually works.</p>
        {rows.length === 0 ? <p className="mt-6 text-sm text-[var(--mc-muted)]">No FAQs published yet.</p> : null}
        <div className="mt-8 space-y-8">
          {categories.map((category) => (
            <section key={category}>
              <h2 className="text-lg font-bold text-[var(--mc-ink)]">{category}</h2>
              <div className="mt-3 space-y-3">
                {rows.filter((row) => row.category === category).map((row) => (
                  <details key={row.id} className="group rounded-xl border border-[var(--mc-line)] bg-white p-4 shadow-sm">
                    <summary className="cursor-pointer list-none font-semibold text-[var(--mc-ink)]">{row.question}</summary>
                    <p className="mt-2 text-sm leading-6 text-[var(--mc-muted)]">{row.answer}</p>
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
