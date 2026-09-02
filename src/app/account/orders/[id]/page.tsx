import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CustomerRecordDetail } from "@/components/customer-record-detail";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { auth } from "@/lib/auth/server";

export default async function CustomerOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  if (!await auth.api.getSession({ headers: await headers() })) redirect(`/login?next=${encodeURIComponent(`/account/orders/${id}`)}`);
  return <div className="min-h-screen bg-[var(--mc-surface)]"><StorefrontHeader /><CustomerRecordDetail kind="order" id={id} /><StorefrontFooter /></div>;
}
