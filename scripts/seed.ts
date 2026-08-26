import dotenv from "dotenv";
import { createHash } from "node:crypto";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
const { db, pool } = await import("../src/lib/db");
const { categories, pricingRules, productVariants, products } = await import("../src/lib/db/schema");
const { sql } = await import("drizzle-orm");
const { catalogCategories, catalogProducts } = await import("../src/lib/catalog");
const { pdfPricingRows } = await import("../src/lib/pdf-pricing");

function uuidFor(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const categoryIds = new Map(catalogCategories.map((category) => [category.slug, uuidFor(`category:${category.slug}`)]));
const pdfProducts = [
  ["paper-job", "Paper Job", "printing"], ["cover-job", "Cover Job", "printing"], ["gsm-130-170", "130 GSM - 170 GSM", "printing"], ["sticker-mix-hm", "Sticker Mix - HM", "labels-stickers"], ["mix-250gsm", "250 GSM Mix", "labels-stickers"], ["pamphlets", "Pamphlets", "printing"], ["sticker-print", "Stikar Print", "labels-stickers"], ["doctor-file-job", "Doctor File Job", "stationery"], ["job-250gsm", "250 GSM Job", "printing"],
] as const;

await db.insert(categories).values(catalogCategories.map((category, index) => ({ id: categoryIds.get(category.slug)!, name: category.name, slug: category.slug, description: category.description, sortOrder: index }))).onConflictDoUpdate({ target: categories.slug, set: { name: categories.name, description: categories.description, updatedAt: new Date() } });

const allProducts = [
  ...catalogProducts.map((product) => ({ id: product.id, categorySlug: product.categorySlug, name: product.name, slug: product.slug, description: product.description, configuration: product.configuration, imageUrl: product.imageUrl, orderable: product.orderable, quoteable: product.quoteable })),
  ...pdfProducts.map(([slug, name, categorySlug]) => ({ id: uuidFor(`product:${slug}`), categorySlug, name, slug, description: `PDF-derived price list product: ${name}`, configuration: {}, imageUrl: undefined, orderable: false, quoteable: true })),
];

await db.insert(products).values(allProducts.map((product) => ({ id: product.id, categoryId: categoryIds.get(product.categorySlug), name: product.name, slug: product.slug, description: product.description, configuration: { fields: product.configuration }, imageUrl: product.imageUrl, orderable: product.orderable ?? false, quoteable: product.quoteable ?? true, productType: "CONFIGURABLE" }))).onConflictDoUpdate({ target: products.slug, set: { categoryId: sql`excluded."categoryId"`, name: sql`excluded."name"`, description: sql`excluded."description"`, configuration: sql`excluded."configuration"`, imageUrl: sql`excluded."imageUrl"`, orderable: sql`excluded."orderable"`, quoteable: sql`excluded."quoteable"`, updatedAt: new Date() } });

const variants = allProducts.map((product) => ({ id: uuidFor(`variant:${product.slug}`), productId: product.id, name: "Standard", sku: `MHC-${product.slug.toUpperCase().replaceAll("-", "_")}`, options: {}, basePrice: "0" }));
await db.insert(productVariants).values(variants).onConflictDoUpdate({ target: productVariants.sku, set: { productId: productVariants.productId, updatedAt: new Date() } });

const productIds = new Map(allProducts.map((product) => [product.slug, product.id]));
const pricingValues = pdfPricingRows.map((row) => ({ id: uuidFor(`price:${row.productSlug}:${row.quantity}:${row.name}:${row.amount}`), productId: productIds.get(row.productSlug) ?? uuidFor(`product:${row.productSlug}`), variantId: uuidFor(`variant:${row.productSlug}`), name: `${row.name} / ${row.quantity}`, ruleType: "PDF_PRICE_LIST", conditions: { quantity: row.quantity, ...row.options }, priceFormula: { amount: row.amount, unit: row.unit, source: "PRICE_LIST_2026.pdf" } }));
await db.insert(pricingRules).values(pricingValues).onConflictDoNothing();

console.log(`Seeded ${catalogCategories.length} categories, ${allProducts.length} products, and ${pricingValues.length} PDF-derived pricing rules.`);
await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
