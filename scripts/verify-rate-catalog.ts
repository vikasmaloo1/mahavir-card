import dotenv from "dotenv";
import { and, eq, inArray, sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { addons, categories, productAddons, products } = await import("../src/lib/db/schema");
  const expectedSlugs = ["visiting-card", "premium-card", "art-card", "letterhead-envelope", "brochure", "leaflet-cover", "sticker"];
  const [categoryCount] = await db.select({ value: sql<number>`count(*)::int` }).from(categories).where(eq(categories.isActive, true));
  const [expectedCount] = await db.select({ value: sql<number>`count(*)::int` }).from(categories).where(and(eq(categories.isActive, true), inArray(categories.slug, expectedSlugs)));
  const [productCount] = await db.select({ value: sql<number>`count(*)::int` }).from(products).where(and(eq(products.isActive, true), eq(products.status, "ACTIVE")));
  const cornerMappings = await db.select({ product: products.slug, addonCode: addons.code, price: productAddons.price }).from(productAddons).innerJoin(products, eq(productAddons.productId, products.id)).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.isActive, true), eq(addons.code, "CORNER_CUT")));
  if (categoryCount.value !== 7 || expectedCount.value !== 7) throw new Error(`Expected only 7 active RATE.xlsx categories, found ${categoryCount.value}.`);
  if (productCount.value !== 39) throw new Error(`Expected 39 active RATE.xlsx configurations, found ${productCount.value}.`);
  if (cornerMappings.length !== 2 || cornerMappings.some((mapping) => Number(mapping.price) !== 300)) throw new Error(`Corner Cut must have 2 active mappings at Rs 300; found ${JSON.stringify(cornerMappings)}.`);
  console.log(JSON.stringify({ activeCategories: categoryCount.value, activeProducts: productCount.value, cornerCutMappings: cornerMappings }, null, 2));
  await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
