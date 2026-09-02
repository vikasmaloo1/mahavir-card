import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { ChevronRight, Shield } from "lucide-react";

import { db } from "@/lib/db/server";
import { terms } from "@/lib/db/schema";
import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { CustomerNotices } from "@/components/customer-notices";
import { TermsViewer, type TermRecord } from "@/components/terms-viewer";

export const metadata: Metadata = {
  title: "Terms & Conditions | Commercial Printing Policies | Mahavir Card",
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

        {/* Hero Banner */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-[#0f2347] to-[#1e3a8a] p-6 sm:p-10 text-white shadow-md">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#93c5fd]">
                <Shield size={14} />
                Trade Printing Policies
              </div>
              <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Terms & Conditions
              </h1>
              <p className="mt-2 max-w-2xl text-sm sm:text-base text-[#cbd5e1] leading-relaxed">
                Commercial offset & digital printing terms, quality disclaimers, dispatch responsibilities, and legal agreements for Mahavir Card / Printers Club of India Limited.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Multilingual Terms Viewer */}
        <TermsViewer terms={termsList} />
      </main>

      <StorefrontFooter />
    </div>
  );
}
