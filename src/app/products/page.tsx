import { ProductsBrowser } from "@/components/products-browser";
import { StorefrontFooter } from "@/components/storefront-footer";
import { StorefrontHeader } from "@/components/storefront-header";
import { Suspense } from "react";

export default function ProductsPage() {
  return <div className="mc-storefront bg-[var(--mc-surface)]"><StorefrontHeader /><Suspense fallback={<main className="min-h-screen p-8 text-sm text-[var(--mc-muted)]">Loading products...</main>}><ProductsBrowser /></Suspense><StorefrontFooter /></div>;
}
