import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CustomerProfileForm } from "@/components/customer-profile-form";
import { StorefrontHeader } from "@/components/storefront-header";
import { auth } from "@/lib/auth/server";

export default async function CustomerProfilePage() {
  if (!await auth.api.getSession({ headers: await headers() })) redirect("/login");
  return <main className="mc-storefront min-h-screen bg-[var(--mc-surface)] text-[var(--mc-ink)]"><StorefrontHeader /><div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12"><CustomerProfileForm /></div></main>;
}
