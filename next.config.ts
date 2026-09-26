import type { NextConfig } from "next";
// Legacy /catalog/<category-or-alias> URLs become true 308s here (before rendering), so crawlers never
// see a streamed 200 shell for them. Product slugs are untouched because they never match an alias.
// Keep in sync with catalogCategories (src/lib/catalog-routing.ts) and seoCategoryPages (src/lib/seo-categories.ts);
// next.config cannot import from src/, so the mapping is mirrored here.
const legacyCategoryAliases: Record<string, string[]> = {
  "visiting-card-printing-ahmedabad": ["visiting-card", "visiting-cards", "business-cards", "business-card", "cards", "card", "visitingcard", "businesscards"],
  "premium-visiting-cards-ahmedabad": ["premium-card", "premium-cards", "velvet-cards", "foil-cards", "spot-uv-cards", "luxury-cards"],
  "art-card-printing-ahmedabad": ["art-card", "art-cards", "artcard", "artcards"],
  "letterhead-envelope-printing-ahmedabad": ["letterhead-envelope", "letterhead", "letterheads", "envelope", "envelopes", "letterhead-envelopes", "letterheads-envelopes", "stationery", "office-stationery"],
  "brochure-printing-ahmedabad": ["brochure", "brochures", "pamphlet", "pamphlets", "flyers", "flyer"],
  "leaflet-printing-ahmedabad": ["leaflet-cover", "leaflet", "leaflets", "cover", "covers"],
  "sticker-printing-ahmedabad": ["sticker", "stickers", "label", "labels", "labels-stickers", "vinyl-stickers", "roll-labels"],
};
const legacyCategoryRedirects = Object.entries(legacyCategoryAliases).flatMap(([landing, aliases]) =>
  aliases.map((alias) => ({ source: "/catalog/" + alias, destination: "/" + landing, permanent: true })),
);

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "mahavircard.in",
      },
    ],
  },
  async redirects() {
    return [
      ...legacyCategoryRedirects,
      // The old static catalogue files were generated offline from a hardcoded product list and
      // are gone; point any link that still exists at the live, data-driven export.
      { source: "/mahavir-card-catalogue.pdf", destination: "/api/catalog/pdf?mode=RETAIL", permanent: true },
      { source: "/mahavir-card-rate-catalogue.pdf", destination: "/api/catalog/pdf?mode=RETAIL", permanent: true },
      { source: "/mahavir-card-showroom-catalogue.pdf", destination: "/api/catalog/pdf?mode=SHOWROOM", permanent: true },
      {
        source: "/catalogue",
        destination: "/products",
        permanent: true,
      },
      {
        source: "/catalogue/:slug*",
        destination: "/catalog/:slug*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
