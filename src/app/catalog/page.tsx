import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCatalogViewer } from "@/lib/catalog-access";
import { getCatalogModel } from "@/lib/catalog-model";
import { PublicProductCatalog } from "@/components/public-product-catalog";

/**
 * The catalogue carries live trade and retail rates, so it is behind login and excluded from
 * search. The public, crawlable product pages are the category landing pages (see
 * src/lib/seo-categories.ts), which stay open.
 */
export const metadata: Metadata = {
  title: "Product Catalogue & Rate List | Mahavir Card Ahmedabad",
  description: "Signed-in rate catalogue for Mahavir Card trade and retail account holders.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CatalogPage() {
  const viewer = await getCatalogViewer();
  if (!viewer) redirect("/login?next=%2Fcatalog");

  // Same model the PDF export builds from (src/lib/catalog-model.ts), so the page and the
  // downloaded catalogue can never list different products, images or rates.
  const { categories, businessInfo } = await getCatalogModel();

  return (
    <PublicProductCatalog
      categories={categories}
      businessInfo={businessInfo}
      allowedModes={viewer.allowedModes}
      defaultMode={viewer.defaultMode}
    />
  );
}
