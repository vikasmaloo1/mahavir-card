import dotenv from "dotenv";
import { createHash } from "node:crypto";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
const { db, pool } = await import("../src/lib/db");
const { addons, categories, pricingRules, productAddons, productContentItems, productContentSections, productDeliveryRules, productImages, productVariants, products } = await import("../src/lib/db/schema");
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

const businessCardId = productIds.get("business-cards")!;
await db.update(products).set({
  shortDescription: "Visiting cards with database-managed finishes, delivery, and approved pricing.",
  productCode: "VC",
  productReference: "MHC-VC",
  productClass: "Visiting Cards",
  productionTime: "2-3 working days",
  artworkRequired: true,
  artworkInstructions: "Upload final CorelDRAW artwork (.cdr) with text converted to curves.",
  referenceQuantity: 1000,
  referenceWeight: "1.000",
  referenceWeightUnit: "KG",
  pricesTaxInclusive: true,
  status: "ACTIVE",
  updatedAt: new Date(),
}).where(sql`${products.id} = ${businessCardId}`);

const addonRows = [
  { id: uuidFor("addon:velvet-lamination"), name: "Velvet Lamination", code: "VELVET_LAMINATION", description: "Soft-touch protective finish.", pricingType: "FIXED" },
  { id: uuidFor("addon:spot-uv"), name: "Spot UV", code: "SPOT_UV", description: "Raised gloss detail on selected artwork areas.", pricingType: "FIXED" },
];
await db.insert(addons).values(addonRows).onConflictDoUpdate({ target: addons.code, set: { name: sql`excluded."name"`, description: sql`excluded."description"`, pricingType: sql`excluded."pricingType"`, isActive: true, updatedAt: new Date() } });
await db.insert(productAddons).values([
  { id: uuidFor("product-addon:business-cards:velvet"), productId: businessCardId, addonId: addonRows[0].id, price: "100.00", sortOrder: 0, isActive: true, taxInclusive: true },
  { id: uuidFor("product-addon:business-cards:spot-uv"), productId: businessCardId, addonId: addonRows[1].id, price: "150.00", sortOrder: 1, isActive: true, taxInclusive: true },
]).onConflictDoUpdate({ target: productAddons.id, set: { price: sql`excluded."price"`, sortOrder: sql`excluded."sortOrder"`, isActive: true, taxInclusive: true, updatedAt: new Date() } });
await db.insert(productDeliveryRules).values([
  { id: uuidFor("delivery:business-cards:pickup"), productId: businessCardId, deliveryMethod: "PICKUP", stateCode: "*", price: "0.00", sortOrder: 0, isActive: true, taxInclusive: true },
  { id: uuidFor("delivery:business-cards:courier:gj"), productId: businessCardId, deliveryMethod: "COURIER", stateCode: "GJ", price: "80.00", sortOrder: 1, isActive: true, taxInclusive: true },
  { id: uuidFor("delivery:business-cards:courier:default"), productId: businessCardId, deliveryMethod: "COURIER", stateCode: "*", price: "120.00", sortOrder: 2, isActive: true, taxInclusive: true },
]).onConflictDoUpdate({ target: productDeliveryRules.id, set: { price: sql`excluded."price"`, sortOrder: sql`excluded."sortOrder"`, isActive: true, taxInclusive: true, updatedAt: new Date() } });
await db.insert(productImages).values({ id: uuidFor("image:business-cards:primary"), productId: businessCardId, imageUrl: "/images/mahavir-print-assortment.png", altText: "Mahavir Card business card samples", sortOrder: 0, isPrimary: true }).onConflictDoUpdate({ target: productImages.id, set: { imageUrl: sql`excluded."imageUrl"`, altText: sql`excluded."altText"`, sortOrder: 0, isPrimary: true, updatedAt: new Date() } });
const sectionRows = [
  { id: uuidFor("content:business-cards:details"), productId: businessCardId, title: "Product details", sortOrder: 0 },
  { id: uuidFor("content:business-cards:artwork"), productId: businessCardId, title: "Artwork notes", sortOrder: 1 },
];
await db.insert(productContentSections).values(sectionRows).onConflictDoUpdate({ target: productContentSections.id, set: { title: sql`excluded."title"`, sortOrder: sql`excluded."sortOrder"`, updatedAt: new Date() } });
await db.insert(productContentItems).values([
  { id: uuidFor("content-item:business-cards:details:quantity"), sectionId: sectionRows[0].id, label: "Reference quantity", content: "1,000 cards is configured as the reference quantity.", sortOrder: 0 },
  { id: uuidFor("content-item:business-cards:artwork:cdr"), sectionId: sectionRows[1].id, label: "Artwork", content: "Supply final .cdr artwork with fonts converted to curves.", sortOrder: 0 },
]).onConflictDoUpdate({ target: productContentItems.id, set: { label: sql`excluded."label"`, content: sql`excluded."content"`, sortOrder: sql`excluded."sortOrder"`, updatedAt: new Date() } });

console.log(`Seeded ${catalogCategories.length} categories, ${allProducts.length} products, and ${pricingValues.length} PDF-derived pricing rules.`);
await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
