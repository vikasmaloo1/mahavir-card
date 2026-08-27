import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/server";
import { StorefrontHeader } from "@/components/storefront-header";
import { StorefrontFooter } from "@/components/storefront-footer";
import { WalletDashboard } from "@/components/wallet-dashboard";

export default async function WalletPage() {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login");
  return <div className="min-h-screen bg-[var(--mc-surface)]"><StorefrontHeader /><WalletDashboard /><StorefrontFooter /></div>;
}
