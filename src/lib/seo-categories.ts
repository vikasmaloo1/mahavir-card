import { resolveCategorySlug, type CanonicalCategorySlug } from "@/lib/catalog-routing";

/**
 * Server-rendered, indexable landing page for each catalogue category.
 * `path` is the public URL segment; `category` is the internal catalogue slug it lists.
 */
export type SeoCategoryPage = {
  path: string;
  category: CanonicalCategorySlug;
  name: string;
  h1: string;
  title: string;
  description: string;
};

export const seoCategoryPages: readonly SeoCategoryPage[] = [
  {
    path: "visiting-card-printing-ahmedabad",
    category: "visiting-card",
    name: "Visiting Cards",
    h1: "Visiting Card Printing in Ahmedabad",
    title: "Visiting Card Printing in Ahmedabad | Live Rates & CDR Upload",
    description: "Offset visiting card printing in Ahmedabad from Mahavir Card — NT single & front-back, tearable art card and thermal matt cards. Live per-1000 rates, CDR artwork upload, fast turnaround.",
  },
  {
    path: "premium-visiting-cards-ahmedabad",
    category: "premium-card",
    name: "Premium Visiting Cards",
    h1: "Premium Visiting Cards in Ahmedabad",
    title: "Premium Visiting Cards Ahmedabad | Velvet, Spot UV, Foil & Drip-Off",
    description: "Premium 400 GSM velvet visiting cards with spot UV, foil stamping and drip-off finishes, printed in Ahmedabad by Mahavir Card. Corner cut included, live pricing, CDR upload.",
  },
  {
    path: "art-card-printing-ahmedabad",
    category: "art-card",
    name: "Art Card Printing",
    h1: "Art Card Printing in Ahmedabad",
    title: "Art Card Printing in Ahmedabad | 250 GSM Single & Both Side",
    description: "250 GSM art card printing in Ahmedabad — single side, both side and laminated options priced per square inch. Instant online rates and CDR artwork upload from Mahavir Card.",
  },
  {
    path: "letterhead-envelope-printing-ahmedabad",
    category: "letterhead-envelope",
    name: "Letterhead & Envelope Printing",
    h1: "Letterhead & Envelope Printing in Ahmedabad",
    title: "Letterhead & Envelope Printing in Ahmedabad | Mahavir Card",
    description: "Corporate letterhead and envelope printing in Ahmedabad on 80–100 GSM Alabaster and SS finish paper. Matching stationery sets, live rates and CDR upload from Mahavir Card.",
  },
  {
    path: "brochure-printing-ahmedabad",
    category: "brochure",
    name: "Brochure Printing",
    h1: "Brochure Printing in Ahmedabad",
    title: "Brochure Printing in Ahmedabad | A4 & A8 Art Card Brochures",
    description: "Commercial brochure printing in Ahmedabad — A4 and A8 250 GSM art card brochures with lamination and machine creasing. Bulk-run offset pricing from Mahavir Card.",
  },
  {
    path: "leaflet-printing-ahmedabad",
    category: "leaflet-cover",
    name: "Leaflet Printing",
    h1: "Leaflet & Flyer Printing in Ahmedabad",
    title: "Leaflet & Flyer Printing in Ahmedabad | 130 & 170 GSM Art Paper",
    description: "Leaflet and flyer printing in Ahmedabad on 130 GSM and 170 GSM art paper, single side or front-back. Volume offset pricing and CDR artwork upload from Mahavir Card.",
  },
  {
    path: "sticker-printing-ahmedabad",
    category: "sticker",
    name: "Sticker Printing",
    h1: "Sticker & Label Printing in Ahmedabad",
    title: "Sticker & Label Printing in Ahmedabad | Per Square Inch Rates",
    description: "Sticker and label printing in Ahmedabad — standard and Avery adhesive stock, with or without lamination, priced by exact square inch. Live rates and CDR upload from Mahavir Card.",
  },
] as const;

const byPath = new Map(seoCategoryPages.map((page) => [page.path, page] as const));
const byCategory = new Map(seoCategoryPages.map((page) => [page.category, page] as const));

export function seoCategoryByPath(path: string): SeoCategoryPage | null {
  return byPath.get(path) ?? null;
}

export function seoCategoryForSlug(categorySlug: string): SeoCategoryPage | null {
  return byCategory.get(categorySlug as CanonicalCategorySlug) ?? null;
}

/** Public href for a category. Falls back to the filter URL for anything without a landing page. */
export function categoryHref(categorySlug: string): string {
  const page = seoCategoryForSlug(categorySlug);
  return page ? `/${page.path}` : `/products?category=${categorySlug}`;
}

/** Rewrites a legacy `/products?category=<slug-or-alias>` link to its landing page; other URLs pass through. */
export function normalizeCategoryHref(url: string | null | undefined): string {
  if (!url) return "/products";
  const match = url.match(/^\/products\/?\?category=([^&#]+)/);
  if (!match) return url;
  const canonical = resolveCategorySlug(decodeURIComponent(match[1]));
  const page = canonical ? seoCategoryForSlug(canonical) : null;
  return page ? `/${page.path}` : url;
}
