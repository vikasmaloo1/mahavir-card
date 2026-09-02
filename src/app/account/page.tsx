import type { Metadata } from "next";
import { AccountDashboard } from "@/components/account-dashboard";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { getCachedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Account Dashboard",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  if (!await getCachedSession()) redirect("/login?next=%2Faccount");
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8 lg:py-12">
        <AccountDashboard />
      </div>
      <StorefrontFooter />
    </main>
  );
}
