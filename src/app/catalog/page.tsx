import type { Metadata } from "next";

import { getCatalogModel } from "@/lib/catalog-model";
import { PublicProductCatalog } from "@/components/public-product-catalog";

export const metadata: Metadata = {
  title: "Official Product Catalogue & Price List | Mahavir Card Ahmedabad",
  description:
    "Explore Mahavir Card's complete commercial printing catalogue with authentic product photos, specifications, and live price ranges. Visiting cards, stationery, brochures, and custom publications. Call / WhatsApp +91 79847 52154.",
  alternates: {
    canonical: "/catalog",
  },
  openGraph: {
    title: "Official Product & Rate Catalogue | Mahavir Card Ahmedabad",
    description:
      "Commercial offset printing catalogue with photos & price ranges. Visiting cards, envelopes, brochures, stickers & packaging. Direct helpline: +91 79847 52154.",
    url: "https://mahavircard.in/catalog",
    images: [
      {
        url: "/images/products/velvet-gold-foil-pair.jpg",
        width: 1200,
        height: 630,
        alt: "Mahavir Card Printing Catalogue",
      },
    ],
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicCatalogPage() {
  // Same model the PDF export builds from (src/lib/catalog-model.ts), so the page and the
  // downloaded catalogue can never list different products, images or rates.
  const { categories, businessInfo } = await getCatalogModel();
  return <PublicProductCatalog categories={categories} businessInfo={businessInfo} />;
}
