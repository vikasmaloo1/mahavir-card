import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { db } from "@/lib/db/server";
import { terms } from "@/lib/db/schema";
import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { CustomerNotices } from "@/components/customer-notices";
import { TermsViewer, type TermRecord } from "@/components/terms-viewer";

export const metadata: Metadata = {
  title: "Terms & Conditions | Commercial Printing Policies",
  description: "Official terms and conditions, color matching disclaimers, goods responsibility, and legal policies for Mahavir Card in Ahmedabad, Gujarat.",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms & Conditions — Mahavir Card Ahmedabad",
    description: "Official terms, color reproduction rules, godown dispatch policies, and legal jurisdiction for Mahavir Card.",
    url: "https://mahavircard.in/terms",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const termsList: TermRecord[] = await db
    .select({
      id: terms.id,
      title: terms.title,
      titleGu: terms.titleGu,
      titleHi: terms.titleHi,
      content: terms.content,
      contentGu: terms.contentGu,
      contentHi: terms.contentHi,
      category: terms.category,
      isImportant: terms.isImportant,
      sortOrder: terms.sortOrder,
      createdAt: terms.createdAt,
    })
    .from(terms)
    .where(eq(terms.isActive, true))
    .orderBy(asc(terms.sortOrder), asc(terms.createdAt));

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a]">
      <StorefrontHeader />
      <CustomerNotices placement="ORDERING" />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-[#64748b]">
          <Link href="/" className="hover:text-[#2457b8]">Home</Link>
          <ChevronRight size={14} />
          <span className="text-[#0f172a]">Terms & Conditions</span>
        </nav>

        {/* Interactive Multilingual Terms Viewer */}
        <TermsViewer terms={termsList} />
      </main>

      <StorefrontFooter />
    </div>
  );
}
