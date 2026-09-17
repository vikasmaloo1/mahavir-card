import "server-only";

import { and, asc, eq, inArray, or } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { categories, pricingRules, productImages, productVariants, products } from "@/lib/db/schema";
import { conciseProductSpecification, deriveStartingPriceMap, type StartingPrice } from "@/lib/product-listing-pricing";

export type CategoryListingItem = StartingPrice & {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  imageAlt: string;
  specification: string;
  productionTime: string | null;
  updatedAt: Date;
};

export type CategoryListing = {
  categoryName: string;
  items: CategoryListingItem[];
  lastModified: Date | null;
};

/**
 * Public (logged-out, B2C) product listing for one category, rendered server-side so the
 * HTML that reaches crawlers already contains every product, price and image.
 */
export async function getCategoryListing(
  categorySlug: string,
  customerType: "B2C" | "B2B" | null = null,
): Promise<CategoryListing | null> {
  const rows = await db
    .select({ product: products, categoryName: categories.name })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(categories.slug, categorySlug), eq(products.isActive, true), eq(products.status, "ACTIVE")))
    .orderBy(asc(products.sortOrder), asc(products.name));

  if (!rows.length) return null;
  const productIds = rows.map((row) => row.product.id);

  const customerRuleFilter = customerType === "B2B"
    ? or(eq(pricingRules.customerType, "B2B"), eq(pricingRules.customerType, "BOTH"))
    : or(eq(pricingRules.customerType, "B2C"), eq(pricingRules.customerType, "BOTH"));

  const [rules, imageRows] = await Promise.all([
    customerType
      ? db
          .select({
            productId: pricingRules.productId,
            variantId: pricingRules.variantId,
            variantActive: productVariants.isActive,
            conditions: pricingRules.conditions,
            priceFormula: pricingRules.priceFormula,
            productionTime: pricingRules.productionTime,
            taxInclusive: pricingRules.taxInclusive,
            isActive: pricingRules.isActive,
          })
          .from(pricingRules)
          .leftJoin(productVariants, eq(pricingRules.variantId, productVariants.id))
          .where(and(inArray(pricingRules.productId, productIds), eq(pricingRules.isActive, true), customerRuleFilter))
          .orderBy(asc(pricingRules.sortOrder))
      : Promise.resolve([]),
    db
      .select({ productId: productImages.productId, imageUrl: productImages.imageUrl, altText: productImages.altText, isPrimary: productImages.isPrimary })
      .from(productImages)
      .where(inArray(productImages.productId, productIds))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  const startingPrices = customerType ? deriveStartingPriceMap(rows.map((row) => row.product), rules) : new Map();
  const primaryImage = new Map<string, { imageUrl: string; altText: string | null }>();
  for (const image of imageRows) {
    if (image.isPrimary || !primaryImage.has(image.productId)) primaryImage.set(image.productId, image);
  }
  const productionTimeByProduct = new Map<string, string>();
  for (const rule of rules) {
    if (rule.productionTime && !productionTimeByProduct.has(rule.productId)) productionTimeByProduct.set(rule.productId, rule.productionTime);
  }

  const unauthenticatedPrice: StartingPrice = {
    startingPrice: null,
    startingQuantity: null,
    currency: "INR",
    priceLabel: "Login to view price",
    priceState: "LOGIN",
    taxInclusive: null,
  };

  const items: CategoryListingItem[] = rows.map(({ product, categoryName }) => {
    const image = primaryImage.get(product.id);
    return {
      ...(customerType
        ? (startingPrices.get(product.id) ?? { startingPrice: null, startingQuantity: null, currency: "INR", priceLabel: "Contact us for pricing", priceState: "CONTACT", taxInclusive: null })
        : unauthenticatedPrice),
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: image?.imageUrl || product.imageUrl || "/images/mahavir-print-assortment.png",
      imageAlt: image?.altText || `${product.name} — ${categoryName} printing sample by Mahavir Card, Ahmedabad`,
      specification: conciseProductSpecification(product.name, product.shortDescription, categoryName),
      productionTime: product.productionTime || productionTimeByProduct.get(product.id) || null,
      updatedAt: product.updatedAt,
    };
  });

  const lastModified = items.reduce<Date | null>((latest, item) => (!latest || item.updatedAt > latest ? item.updatedAt : latest), null);
  return { categoryName: rows[0].categoryName, items, lastModified };
}
