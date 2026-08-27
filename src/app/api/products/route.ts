import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworkRequirements, categories, pricingRules, productAddons, products, productVariants } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { deriveStartingPriceMap } from "@/lib/product-listing-pricing";
import { productSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const search = params.get("q")?.trim();
    const category = params.get("category")?.trim();
    const orderable = params.get("orderable");
    const quoteable = params.get("quoteable");
    const conditions = [eq(products.isActive, true), eq(products.status, "ACTIVE")];
    if (search) conditions.push(or(ilike(products.name, `%${search}%`), ilike(products.description, `%${search}%`), ilike(products.shortDescription, `%${search}%`))!);
    if (category) conditions.push(eq(categories.slug, category));
    if (orderable === "true") conditions.push(eq(products.orderable, true));
    if (quoteable === "true") conditions.push(eq(products.quoteable, true));
    const data = await db.select({ product: products, category: { name: categories.name, slug: categories.slug } }).from(products).leftJoin(categories, eq(products.categoryId, categories.id)).where(and(...conditions)).orderBy(asc(products.sortOrder), asc(products.name));
    const productIds = data.map(({ product }) => product.id);
    const [rules, addonRows, artworkRows] = productIds.length ? await Promise.all([
      db.select({ productId: pricingRules.productId, variantId: pricingRules.variantId, variantActive: productVariants.isActive, conditions: pricingRules.conditions, priceFormula: pricingRules.priceFormula, taxInclusive: pricingRules.taxInclusive, isActive: pricingRules.isActive }).from(pricingRules).leftJoin(productVariants, eq(pricingRules.variantId, productVariants.id)).where(and(inArray(pricingRules.productId, productIds), eq(pricingRules.isActive, true))),
      db.select({ productId: productAddons.productId }).from(productAddons).where(and(inArray(productAddons.productId, productIds), eq(productAddons.isActive, true))),
      db.select({ productId: artworkRequirements.productId, artworkRequired: artworkRequirements.artworkRequired }).from(artworkRequirements).where(and(inArray(artworkRequirements.productId, productIds), eq(artworkRequirements.isActive, true))),
    ]) : [[], [], []];
    const startingPrices = deriveStartingPriceMap(data.map(({ product }) => product), rules);
    const productAddonsMap = new Set(addonRows.map((row) => row.productId));
    const artworkMap = new Set(artworkRows.filter((row) => row.artworkRequired).map((row) => row.productId));
    return jsonOk(data.map(({ product, category: categoryData }) => ({ ...product, category: categoryData, ...startingPrices.get(product.id), hasAddons: productAddonsMap.has(product.id), hasArtworkRequirement: artworkMap.has(product.id) })));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, productSchema);
    const [product] = await db.insert(products).values(input).returning();
    return product ? jsonOk(product, 201) : jsonError("Product was not created", 500);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
