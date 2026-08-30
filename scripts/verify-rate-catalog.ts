import dotenv from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { addons, categories, locationSurcharges, pricingRules, productAddons, productDeliveryRules, products } = await import("../src/lib/db/schema");
  const expectedSlugs = ["visiting-card", "premium-card", "art-card", "letterhead-envelope", "brochure", "leaflet-cover", "sticker"];
  const [categoryCount] = await db.select({ value: sql<number>`count(*)::int` }).from(categories).where(eq(categories.isActive, true));
  const [expectedCount] = await db.select({ value: sql<number>`count(*)::int` }).from(categories).where(and(eq(categories.isActive, true), inArray(categories.slug, expectedSlugs)));
  const [productCount] = await db.select({ value: sql<number>`count(*)::int` }).from(products).where(and(eq(products.isActive, true), eq(products.status, "ACTIVE")));
  const cornerMappings = await db.select({ product: products.slug, addonCode: addons.code, price: productAddons.price }).from(productAddons).innerJoin(products, eq(productAddons.productId, products.id)).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.isActive, true), eq(addons.code, "CORNER_CUT")));
  const deliveryRows = await db.select({ method: productDeliveryRules.deliveryMethod, stateCode: productDeliveryRules.stateCode, price: productDeliveryRules.price }).from(productDeliveryRules).innerJoin(products, eq(productDeliveryRules.productId, products.id)).where(and(eq(productDeliveryRules.isActive, true), eq(products.isActive, true)));
  const surchargeRows = await db.select({ product: products.slug, scope: locationSurcharges.locationScope, city: locationSurcharges.city, amount: locationSurcharges.amount }).from(locationSurcharges).innerJoin(products, eq(locationSurcharges.productId, products.id)).where(and(eq(locationSurcharges.isActive, true), eq(products.isActive, true)));
  const cardTaxRows = await db.select({ slug: products.slug, taxRate: pricingRules.taxRate }).from(pricingRules).innerJoin(products, eq(pricingRules.productId, products.id)).where(and(eq(pricingRules.isActive, true), inArray(products.productReference, ["RATE.xlsx/Sheet1", "RATE.xlsx/Sheet2"])));
  if (categoryCount.value !== 7 || expectedCount.value !== 7) throw new Error(`Expected only 7 active RATE.xlsx categories, found ${categoryCount.value}.`);
  if (productCount.value !== 39) throw new Error(`Expected 39 active RATE.xlsx configurations, found ${productCount.value}.`);
  if (cornerMappings.length !== 2 || cornerMappings.some((mapping) => Number(mapping.price) !== 300)) throw new Error(`Corner Cut must have 2 active mappings at Rs 300; found ${JSON.stringify(cornerMappings)}.`);
  if (deliveryRows.length !== 117) throw new Error(`Expected 117 active delivery rows for 39 products, found ${deliveryRows.length}.`);
  if (deliveryRows.filter((row) => row.method === "PICKUP" && row.stateCode === "*" && Number(row.price) === 0).length !== 39) throw new Error("Every active product must have free pickup.");
  if (deliveryRows.filter((row) => row.method === "COURIER" && row.stateCode === "GJ" && Number(row.price) === 80).length !== 39) throw new Error("Every active product must have the configured Gujarat courier price.");
  if (deliveryRows.filter((row) => row.method === "COURIER" && row.stateCode === "*" && Number(row.price) === 120).length !== 39) throw new Error("Every active product must have the configured other-state courier price.");
  if (surchargeRows.length !== 1 || surchargeRows[0].product !== "nt-single" || surchargeRows[0].scope !== "OUTSIDE_CITY" || surchargeRows[0].city !== "Ahmedabad" || Number(surchargeRows[0].amount) !== 10) throw new Error(`NT Single outside-Ahmedabad surcharge is incorrect: ${JSON.stringify(surchargeRows)}.`);
  if (cardTaxRows.length !== 15 || cardTaxRows.some((row) => Number(row.taxRate) !== 18)) throw new Error("All Sheet 1 and Sheet 2 prices must carry the workbook 18% GST rate.");
  console.log(JSON.stringify({ activeCategories: categoryCount.value, activeProducts: productCount.value, cornerCutMappings: cornerMappings, deliveryRows: deliveryRows.length, ntSingleOutsideAhmedabad: surchargeRows[0], gstVerifiedProducts: cardTaxRows.length }, null, 2));
  await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
