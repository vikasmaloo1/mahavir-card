import { getCachedSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

import { CustomerRecordDetail } from "@/components/customer-record-detail";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";

export default async function CustomerQuotePage({ params }: PageProps<"/account/quotes/[id]">) {
  const { id } = await params;
  if (!await getCachedSession()) redirect(`/login?next=${encodeURIComponent(`/account/quotes/${id}`)}`);
  return <div className="min-h-screen bg-[var(--mc-surface)]"><StorefrontHeader /><CustomerRecordDetail kind="quote" id={id} /><StorefrontFooter /></div>;
}
