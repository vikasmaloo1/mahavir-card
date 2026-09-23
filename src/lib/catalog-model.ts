import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { b2bRateOverrides } from "@/lib/b2b-rate-catalog";
import { db } from "@/lib/db/server";
import {
  businessSettings,
  categories as categoriesTable,
  productImages,
  products as productsTable,
} from "@/lib/db/schema";
import { rateCatalog } from "@/lib/rate-catalog";

/**
 * Single source of truth for the public catalogue. The browser page (/catalog) and the
 * PDF export both build from this, so they can never drift apart.
 */

// The mode primitives live in catalog-pricing (no server-only deps) so client components and
// tests can use them; re-exported here because this module is the catalogue entry point.
export {
  CATALOG_MODE_LABELS,
  CATALOG_PRICE_MODES,
  isCatalogPriceMode,
  type CatalogPriceMode,
} from "@/lib/catalog-pricing";

export type CatalogProduct = {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  shortDescription?: string;
  productionTime?: string;
  referenceQuantity?: number;
  referenceWeight?: number;
  ruleType: "FIXED_PER_REFERENCE_QUANTITY" | "FIXED" | "PER_SQ_INCH";
  amount?: number;
  ratePerSqInch?: number;
  rateUnit?: "RUPEES" | "PAISE";
  b2bAmount?: number;
  b2bRatePerSqInch?: number;
  size?: string;
  imageUrl: string;
  /** True when no real product photo exists; the PDF renders a neutral placeholder instead of inventing one. */
  imageIsPlaceholder: boolean;
  addon?: { code: string; name: string; amount: number; referenceQuantity?: number };
  bladeCharge?: number;
  minimumArea?: number;
  minimumCharge?: number;
};

export type CatalogCategory = {
  slug: string;
  name: string;
  description: string;
  products: CatalogProduct[];
};

export type CatalogBusinessInfo = {
  name: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  primaryPhone: string;
  whatsappPhone: string;
  email: string;
  website: string;
  gstin: string;
};

export type CatalogModel = {
  categories: CatalogCategory[];
  businessInfo: CatalogBusinessInfo;
  totalProducts: number;
  /** Products that had no real photo — surfaced so missing imagery is reported, not faked. */
  productsWithoutImages: string[];
};

const FALLBACK_IMAGE = "/images/home-hero-printing.jpg";

export async function getCatalogModel(): Promise<CatalogModel> {
  let settingsRow: typeof businessSettings.$inferSelect | undefined;
  let dbProductsWithCat: Array<{
    product: typeof productsTable.$inferSelect;
    category: { name: string; slug: string } | null;
  }> = [];
  let dbImages: Array<typeof productImages.$inferSelect> = [];

  try {
    const [settings, productsRes] = await Promise.all([
      db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1),
      db
        .select({
          product: productsTable,
          category: { name: categoriesTable.name, slug: categoriesTable.slug },
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isActive, true), eq(productsTable.status, "ACTIVE")))
        .orderBy(asc(productsTable.sortOrder), asc(productsTable.name)),
    ]);

    settingsRow = settings[0];
    dbProductsWithCat = productsRes;

    const productIds = dbProductsWithCat.map((row) => row.product.id);
    if (productIds.length) {
      dbImages = await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.sortOrder));
    }
  } catch (error) {
    console.error("Catalogue model: database query failed", error);
  }

  const dbProductBySlug = new Map(dbProductsWithCat.map((row) => [row.product.slug, row] as const));

  // Priority 1: isPrimary image. Otherwise the first image by sortOrder.
  const primaryImageByProductId = new Map<string, string>();
  for (const image of dbImages) {
    if (image.isPrimary) primaryImageByProductId.set(image.productId, image.imageUrl);
  }
  for (const image of dbImages) {
    if (!primaryImageByProductId.has(image.productId)) primaryImageByProductId.set(image.productId, image.imageUrl);
  }

  const productsWithoutImages: string[] = [];

  const categories: CatalogCategory[] = rateCatalog.map((category) => {
    const products: CatalogProduct[] = category.items.map((item) => {
      const dbProduct = dbProductBySlug.get(item.slug)?.product;

      let imageUrl = FALLBACK_IMAGE;
      let imageIsPlaceholder = true;
      if (dbProduct) {
        const uploaded = primaryImageByProductId.get(dbProduct.id);
        if (uploaded) {
          imageUrl = uploaded;
          imageIsPlaceholder = false;
        } else if (dbProduct.imageUrl && !dbProduct.imageUrl.includes("category")) {
          imageUrl = dbProduct.imageUrl;
          imageIsPlaceholder = false;
        }
      }
      if (imageIsPlaceholder) productsWithoutImages.push(item.slug);

      const b2bOverride = b2bRateOverrides[item.slug];

      return {
        id: dbProduct?.id || item.slug,
        name: dbProduct?.name || item.name,
        slug: item.slug,
        categorySlug: category.slug,
        categoryName: category.name,
        shortDescription: dbProduct?.shortDescription || item.shortDescription,
        productionTime: dbProduct?.productionTime || item.productionTime || "3-4 working days",
        referenceQuantity: dbProduct?.referenceQuantity ?? item.referenceQuantity ?? 1000,
        referenceWeight: dbProduct?.referenceWeight ? Number(dbProduct.referenceWeight) : item.referenceWeight,
        ruleType: item.ruleType,
        amount: item.amount,
        ratePerSqInch: item.ratePerSqInch,
        rateUnit: item.rateUnit,
        b2bAmount: b2bOverride?.amount,
        b2bRatePerSqInch: b2bOverride?.ratePerSqInch,
        size: item.size,
        imageUrl,
        imageIsPlaceholder,
        addon: item.addon,
        bladeCharge: item.bladeCharge,
        minimumArea: item.minimumArea,
        minimumCharge: item.minimumCharge,
      };
    });

    return { slug: category.slug, name: category.name, description: category.description, products };
  });

  const businessInfo: CatalogBusinessInfo = {
    name: settingsRow?.businessName || "MAHAVIR CARD",
    tagline: settingsRow?.footerText || "Commercial Offset Printing & Paper Cutting Hub",
    address:
      [settingsRow?.addressLine1, settingsRow?.addressLine2].filter(Boolean).join(", ") ||
      "Khadia Golwad, Opp. Jain Digamber Mandir",
    city: settingsRow?.city || "Ahmedabad",
    state: settingsRow?.state || "Gujarat",
    postalCode: settingsRow?.postalCode || "380001",
    primaryPhone: settingsRow?.phone || "+91 94263 71150",
    whatsappPhone: "+91 79847 52154",
    email: settingsRow?.email || "mahavircard2011@gmail.com",
    website: "www.mahavircard.in",
    gstin: settingsRow?.gstNumber || "24AIUPJ2271L1ZV",
  };

  return {
    categories,
    businessInfo,
    totalProducts: categories.reduce((sum, category) => sum + category.products.length, 0),
    productsWithoutImages,
  };
}
