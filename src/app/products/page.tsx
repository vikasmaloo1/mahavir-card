import { ProductsBrowser } from "@/components/products-browser";
import { StorefrontHeader } from "@/components/storefront-header";
import { Suspense } from "react";

export default function ProductsPage() {
  return <><StorefrontHeader /><Suspense fallback={<main className="min-h-screen bg-[#f7f9fc] p-8 text-sm text-[#607089]">Loading products...</main>}><ProductsBrowser /></Suspense></>;
}
