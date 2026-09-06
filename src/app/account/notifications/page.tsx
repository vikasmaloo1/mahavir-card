import { redirect } from "next/navigation";

import { getCachedSession } from "@/lib/auth/session";
import { AccountNotifications } from "@/components/account-notifications";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export default async function AccountNotificationsPage() {
  if (!await getCachedSession()) redirect(`/login?next=${encodeURIComponent("/account/notifications")}`);
  return <div className="min-h-screen bg-[var(--mc-surface)]"><StorefrontHeader /><AccountNotifications /><StorefrontFooter /></div>;
}
