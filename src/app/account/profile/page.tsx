import { getCachedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

import { CustomerProfileForm } from "@/components/customer-profile-form";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export default async function CustomerProfilePage() {
  if (!await getCachedSession()) redirect("/login?next=%2Faccount%2Fprofile");
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
        <CustomerProfileForm />
      </div>
      <StorefrontFooter />
    </main>
  );
}
