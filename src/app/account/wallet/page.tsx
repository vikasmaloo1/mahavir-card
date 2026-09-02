import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/auth/session";

import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { WalletDashboard } from "@/components/wallet-dashboard";

export default async function WalletPage() {
  if (!await getCachedSession()) redirect("/login?next=%2Faccount%2Fwallet");
  return <div className="min-h-screen bg-[var(--mc-surface)]"><StorefrontHeader /><WalletDashboard /><StorefrontFooter /></div>;
}
