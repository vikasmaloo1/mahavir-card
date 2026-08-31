import Link from "next/link";

import { QuoteFlow } from "@/components/quote-flow";
import { StorefrontHeader } from "@/components/storefront-header";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function QuotePage() {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login");
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <div className="mx-auto max-w-[1120px] px-4 py-8 lg:px-8 lg:py-12">
        <header className="flex flex-col justify-between gap-4 border-b border-[var(--mc-line)] pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase text-[var(--mc-accent)]">Quote basket</p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Custom print request</h1>
            <p className="mt-2 text-[15px] text-[var(--mc-muted)]">Review the selected jobs and send one clear request.</p>
          </div>
          <Link href="/cart" className="text-sm font-bold text-[var(--mc-accent)]">Open purchase basket</Link>
        </header>
        <QuoteFlow />
      </div>
    </main>
  );
}
