import { AccountDashboard } from "@/components/account-dashboard";
import { StorefrontHeader } from "@/components/storefront-header";

export default function AccountPage() {
  return (
    <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]">
      <StorefrontHeader />
      <div className="mx-auto max-w-[1200px] px-4 py-8 lg:px-8 lg:py-12">
        <AccountDashboard />
      </div>
    </main>
  );
}
