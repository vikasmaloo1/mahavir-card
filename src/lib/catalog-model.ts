import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { catalogCustomServices, type CatalogCustomService } from "@/lib/catalog-custom-services";
import type { CatalogRate } from "@/lib/catalog-pricing";
import { db } from "@/lib/db/server";
import {
  addons as addonsTable,
  businessSettings,
  categories as categoriesTable,
  pricingRules as pricingRulesTable,
  productAddons,
  productImages,
  products as productsTable,
} from "@/lib/db/schema";

/**
 * Single source of truth for the catalogue. The browser page (/catalog) and the PDF export
 * both build from this, so they can never drift apart.
 *
 * Everything here comes from the database — active categories, active products, and each
 * segment's active pricing rule. It used to be assembled from the static rate-catalog files,
 * which silently drifted from the rates and categories the rest of the application uses
 * (three trade rates were 100 rupees stale, and one product sat in the wrong category).
 */

// The mode primitives live in catalog-pricing (no server-only deps) so client components and
// tests can use them; re-exported here because this module is the catalogue entry point.
export type { CatalogCustomService, CatalogRate };

export {
  CATALOG_MODE_LABELS,
  CATALOG_MODE_SHORT_LABELS,
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
  size?: string;
  imageUrl: string;
  /** True when no real product photo exists; the PDF renders a neutral placeholder instead of inventing one. */
  imageIsPlaceholder: boolean;
  addon?: { code: string; name: string; amount: number };
  /** B2C rate (tax-exclusive), or null when the product has no active retail rule. */
  retail: CatalogRate | null;
  /** B2B rate (tax-inclusive), or null when the product has no active trade rule. */
  trade: CatalogRate | null;
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
  /** Quote-based commercial work shown after the rated products, in every mode. */
  customServices: CatalogCustomService[];
  /** Products that had no real photo — surfaced so missing imagery is reported, not faked. */
  productsWithoutImages: string[];
};

const FALLBACK_IMAGE = "/images/home-hero-printing.jpg";

type PriceFormula = {
  amount?: string | number | null;
  ratePerSqInch?: number | null;
  ratePaisePerSqInch?: number | null;
  rateUnit?: string | null;
  bladeCharge?: number | null;
  minimumCharge?: number | null;
  minimumArea?: number | null;
};

type RuleRow = {
  productId: string;
  customerType: string;
  ruleType: string;
  conditions: Record<string, unknown>;
  priceFormula: Record<string, unknown>;
  taxRate: string | null;
  taxInclusive: boolean;
  productionTime: string | null;
};

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Turns one pricing-rule row into the rate shape the catalogue renders from. */
function toRate(rule: RuleRow, referenceQuantityFallback: number): CatalogRate {
  const formula = rule.priceFormula as PriceFormula;
  const ruleType =
    rule.ruleType === "PER_SQ_INCH" || rule.ruleType === "FIXED_PER_REFERENCE_QUANTITY" ? rule.ruleType : "FIXED";
  const rateUnit = formula.rateUnit === "PAISE" ? "PAISE" : "RUPEES";

  return {
    ruleType,
    amount: numberOrNull(formula.amount),
    ratePerSqInch: numberOrNull(rateUnit === "PAISE" ? formula.ratePaisePerSqInch ?? formula.ratePerSqInch : formula.ratePerSqInch),
    rateUnit,
    referenceQuantity: numberOrNull((rule.conditions as { quantity?: unknown }).quantity) ?? referenceQuantityFallback,
    bladeCharge: numberOrNull(formula.bladeCharge),
    minimumCharge: numberOrNull(formula.minimumCharge),
    taxInclusive: rule.taxInclusive,
    taxRatePercent: numberOrNull(rule.taxRate) ?? 0,
  };
}

export async function getCatalogModel(): Promise<CatalogModel> {
  let settingsRow: typeof businessSettings.$inferSelect | undefined;
  let productRows: Array<{
    product: typeof productsTable.$inferSelect;
    category: { name: string; slug: string; description: string | null; sortOrder: number };
  }> = [];
  let ruleRows: RuleRow[] = [];
  let imageRows: Array<typeof productImages.$inferSelect> = [];
  let addonRows: Array<{ productId: string; code: string; name: string; priceConfiguration: Record<string, unknown> }> = [];

  try {
    const [settings, products] = await Promise.all([
      db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1),
      // Active products inside active categories, in the order the storefront lists them.
      db
        .select({
          product: productsTable,
          category: {
            name: categoriesTable.name,
            slug: categoriesTable.slug,
            description: categoriesTable.description,
            sortOrder: categoriesTable.sortOrder,
          },
        })
        .from(productsTable)
        .innerJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(
          and(
            eq(productsTable.isActive, true),
            eq(productsTable.status, "ACTIVE"),
            eq(categoriesTable.isActive, true),
          ),
        )
        .orderBy(asc(categoriesTable.sortOrder), asc(productsTable.sortOrder), asc(productsTable.name)),
    ]);

    settingsRow = settings[0];
    productRows = products;

    const productIds = productRows.map((row) => row.product.id);
    if (productIds.length) {
      [ruleRows, imageRows, addonRows] = await Promise.all([
        db
          .select({
            productId: pricingRulesTable.productId,
            customerType: pricingRulesTable.customerType,
            ruleType: pricingRulesTable.ruleType,
            conditions: pricingRulesTable.conditions,
            priceFormula: pricingRulesTable.priceFormula,
            taxRate: pricingRulesTable.taxRate,
            taxInclusive: pricingRulesTable.taxInclusive,
            productionTime: pricingRulesTable.productionTime,
          })
          .from(pricingRulesTable)
          .where(and(inArray(pricingRulesTable.productId, productIds), eq(pricingRulesTable.isActive, true)))
          .orderBy(asc(pricingRulesTable.sortOrder), asc(pricingRulesTable.createdAt)),
        db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, productIds))
          .orderBy(asc(productImages.sortOrder)),
        db
          .select({
            productId: productAddons.productId,
            code: addonsTable.code,
            name: addonsTable.name,
            priceConfiguration: addonsTable.priceConfiguration,
          })
          .from(productAddons)
          .innerJoin(addonsTable, eq(productAddons.addonId, addonsTable.id))
          .where(and(inArray(productAddons.productId, productIds), eq(addonsTable.isActive, true))),
      ]);
    }
  } catch (error) {
    console.error("Catalogue model: database query failed", error);
  }

  // Priority 1: isPrimary image. Otherwise the first image by sortOrder.
  const primaryImageByProductId = new Map<string, string>();
  for (const image of imageRows) {
    if (image.isPrimary) primaryImageByProductId.set(image.productId, image.imageUrl);
  }
  for (const image of imageRows) {
    if (!primaryImageByProductId.has(image.productId)) primaryImageByProductId.set(image.productId, image.imageUrl);
  }

  const rulesByProduct = new Map<string, RuleRow[]>();
  for (const rule of ruleRows) {
    const list = rulesByProduct.get(rule.productId) ?? [];
    list.push(rule);
    rulesByProduct.set(rule.productId, list);
  }

  const addonByProduct = new Map<string, { code: string; name: string; amount: number }>();
  for (const row of addonRows) {
    if (addonByProduct.has(row.productId)) continue;
    const configured = (row.priceConfiguration as { amount?: unknown }).amount;
    addonByProduct.set(row.productId, { code: row.code, name: row.name, amount: numberOrNull(configured) ?? 0 });
  }

  const productsWithoutImages: string[] = [];
  const categoryOrder: string[] = [];
  const categoryBySlug = new Map<string, CatalogCategory>();

  for (const { product, category } of productRows) {
    if (!categoryBySlug.has(category.slug)) {
      categoryOrder.push(category.slug);
      categoryBySlug.set(category.slug, {
        slug: category.slug,
        name: category.name,
        description: category.description || `${category.name} printing by Mahavir Card.`,
        products: [],
      });
    }

    let imageUrl = FALLBACK_IMAGE;
    let imageIsPlaceholder = true;
    const uploaded = primaryImageByProductId.get(product.id);
    if (uploaded) {
      imageUrl = uploaded;
      imageIsPlaceholder = false;
    } else if (product.imageUrl && !product.imageUrl.includes("category")) {
      imageUrl = product.imageUrl;
      imageIsPlaceholder = false;
    }
    if (imageIsPlaceholder) productsWithoutImages.push(product.slug);

    const rules = rulesByProduct.get(product.id) ?? [];
    const referenceQuantity = product.referenceQuantity ?? 1000;
    // "BOTH" serves either segment, so it backs whichever segment has no dedicated rule.
    const retailRule = rules.find((r) => r.customerType === "B2C") ?? rules.find((r) => r.customerType === "BOTH");
    const tradeRule = rules.find((r) => r.customerType === "B2B") ?? rules.find((r) => r.customerType === "BOTH");

    const size = (retailRule ?? tradeRule)?.conditions as { size?: unknown } | undefined;

    categoryBySlug.get(category.slug)!.products.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      categorySlug: category.slug,
      categoryName: category.name,
      shortDescription: product.shortDescription || undefined,
      productionTime: product.productionTime || retailRule?.productionTime || tradeRule?.productionTime || undefined,
      size: typeof size?.size === "string" ? size.size : undefined,
      imageUrl,
      imageIsPlaceholder,
      addon: addonByProduct.get(product.id),
      retail: retailRule ? toRate(retailRule, referenceQuantity) : null,
      trade: tradeRule ? toRate(tradeRule, referenceQuantity) : null,
    });
  }

  const categories = categoryOrder.map((slug) => categoryBySlug.get(slug)!).filter((c) => c.products.length);

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
    email: settingsRow?.email || "mahavircard@gmail.com",
    website: "www.mahavircard.in",
    gstin: settingsRow?.gstNumber || "24AIUPJ2271L1ZV",
  };

  return {
    categories,
    businessInfo,
    customServices: catalogCustomServices,
    totalProducts: categories.reduce((sum, category) => sum + category.products.length, 0),
    productsWithoutImages,
  };
}
