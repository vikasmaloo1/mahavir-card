import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CustomerRecordDetail } from "@/components/customer-record-detail";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { auth } from "@/lib/auth/server";

export default async function CustomerQuotePage({ params }: PageProps<"/account/quotes/[id]">) {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login");
  const { id } = await params;
  return <div className="min-h-screen bg-[var(--mc-surface)]"><StorefrontHeader /><CustomerRecordDetail kind="quote" id={id} /><StorefrontFooter /></div>;
}
