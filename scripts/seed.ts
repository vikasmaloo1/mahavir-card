import dotenv from "dotenv";
import { createHash } from "node:crypto";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
const { db, pool } = await import("../src/lib/db");
const { addons, artworkRequirements, banners, businessSettings, categories, notices, pricingRules, productAddons, productContentItems, productContentSections, productDeliveryRules, productImages, productVariants, products } = await import("../src/lib/db/schema");
const { sql } = await import("drizzle-orm");
const { catalogCategories, catalogProducts } = await import("../src/lib/catalog");
const { businessCardProducts } = await import("../src/lib/business-cards");
const { pdfPricingRows } = await import("../src/lib/pdf-pricing");

function uuidFor(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

const categoryIds = new Map(catalogCategories.map((category) => [category.slug, uuidFor(`category:${category.slug}`)]));
const pdfProducts = [
  ["paper-job", "Paper Job", "printing"], ["cover-job", "Cover Job", "printing"], ["gsm-130-170", "130 GSM - 170 GSM", "printing"], ["sticker-mix-hm", "Sticker Mix - HM", "labels-stickers"], ["mix-250gsm", "250 GSM Mix", "labels-stickers"], ["pamphlets", "Pamphlets", "printing"], ["sticker-print", "Stikar Print", "labels-stickers"], ["doctor-file-job", "Doctor File Job", "stationery"], ["job-250gsm", "250 GSM Job", "printing"],
] as const;

await db.insert(businessSettings).values({ id: "primary", businessName: "Mahavir Card", addressLine1: "Khadia Golwad", addressLine2: "Opp. Jain Digamber Mandir", city: "Ahmedabad", state: "Gujarat", postalCode: "380001", phone: "+91 94263 71150", email: "mahavircard2011@gmail.com", whatsapp: "+91 94263 71150", footerText: "All kind printing solutions for businesses." }).onConflictDoNothing();

await db.insert(categories).values(catalogCategories.map((category, index) => ({ id: categoryIds.get(category.slug)!, name: category.name, slug: category.slug, description: category.description, sortOrder: index }))).onConflictDoUpdate({ target: categories.slug, set: { name: categories.name, description: categories.description, updatedAt: new Date() } });

const allProducts = [
  ...catalogProducts.map((product) => ({ id: product.id, categorySlug: product.categorySlug, name: product.name, slug: product.slug, description: product.description, configuration: product.configuration, imageUrl: product.imageUrl, orderable: product.orderable, quoteable: product.quoteable })),
  ...businessCardProducts.map((product) => ({ id: uuidFor(`product:${product.slug}`), categorySlug: "business-cards", name: product.name, slug: product.slug, description: product.description, configuration: [{ id: "quantity", label: "Quantity", type: "number", defaultValue: "1000" }], imageUrl: "/images/mahavir-print-assortment.png", orderable: true, quoteable: true })),
  ...pdfProducts.map(([slug, name, categorySlug]) => ({ id: uuidFor(`product:${slug}`), categorySlug, name, slug, description: `PDF-derived price list product: ${name}`, configuration: {}, imageUrl: undefined, orderable: false, quoteable: true })),
];

await db.insert(products).values(allProducts.map((product) => ({ id: product.id, categoryId: categoryIds.get(product.categorySlug), name: product.name, slug: product.slug, description: product.description, configuration: { fields: product.configuration }, imageUrl: product.imageUrl, orderable: product.orderable ?? false, quoteable: product.quoteable ?? true, productType: "CONFIGURABLE" }))).onConflictDoUpdate({ target: products.slug, set: { categoryId: sql`excluded."categoryId"`, name: sql`excluded."name"`, description: sql`excluded."description"`, configuration: sql`excluded."configuration"`, imageUrl: sql`excluded."imageUrl"`, orderable: sql`excluded."orderable"`, quoteable: sql`excluded."quoteable"`, updatedAt: new Date() } });

const variants = allProducts.map((product) => ({ id: uuidFor(`variant:${product.slug}`), productId: product.id, name: "Standard", sku: `MHC-${product.slug.toUpperCase().replaceAll("-", "_")}`, options: {}, basePrice: "0" }));
await db.insert(productVariants).values(variants).onConflictDoUpdate({ target: productVariants.sku, set: { productId: productVariants.productId, updatedAt: new Date() } });

const productIds = new Map(allProducts.map((product) => [product.slug, product.id]));
const pricingValues = pdfPricingRows.map((row) => ({ id: uuidFor(`price:${row.productSlug}:${row.quantity}:${row.name}:${row.amount}`), productId: productIds.get(row.productSlug) ?? uuidFor(`product:${row.productSlug}`), variantId: uuidFor(`variant:${row.productSlug}`), name: `${row.name} / ${row.quantity}`, ruleType: "PDF_PRICE_LIST", conditions: { quantity: row.quantity, ...row.options }, priceFormula: { amount: row.amount, unit: row.unit, source: "PRICE_LIST_2026.pdf" } }));
await db.insert(pricingRules).values(pricingValues).onConflictDoNothing();

for (const product of businessCardProducts) {
  const id = uuidFor(`price:${product.slug}:1000:${product.name}:${product.price}`);
  await db.update(pricingRules).set({
    name: `${product.name} / 1000`,
    conditions: { quantity: 1000 },
    priceFormula: { amount: product.price, unit: "batch", source: "PRICE_LIST_2026.pdf" },
    isActive: true,
  }).where(sql`${pricingRules.id} = ${id}`);
}

await db.update(products).set({ isActive: false, status: "ARCHIVED", archivedAt: new Date(), updatedAt: new Date() }).where(sql`${products.slug} = 'business-cards'`);

for (const [index, product] of businessCardProducts.entries()) {
  await db.update(products).set({
    shortDescription: `${product.name} business cards, 1,000 cards per order.`,
    productCode: `VC-${String(index + 1).padStart(2, "0")}`,
    productReference: `MHC-VC-${String(index + 1).padStart(2, "0")}`,
    productClass: "Visiting Cards",
    productionTime: "2-3 working days",
    artworkRequired: true,
    artworkInstructions: "Upload a production-ready CorelDRAW (.cdr) file using the configured dimensions and page order.",
    referenceQuantity: 1000,
    referenceWeight: "1.000",
    referenceWeightUnit: "KG",
    pricesTaxInclusive: true,
    status: "ACTIVE",
    isActive: true,
    archivedAt: null,
    sortOrder: index,
    updatedAt: new Date(),
  }).where(sql`${products.id} = ${productIds.get(product.slug)!}`);
}

const addonRows = [
  { id: uuidFor("addon:velvet-lamination"), name: "Velvet Lamination", code: "VELVET_LAMINATION", description: "Soft-touch protective finish.", pricingType: "FIXED" },
  { id: uuidFor("addon:spot-uv"), name: "Spot UV", code: "SPOT_UV", description: "Raised gloss detail on selected artwork areas.", pricingType: "FIXED" },
];
await db.insert(addons).values(addonRows).onConflictDoUpdate({ target: addons.code, set: { name: sql`excluded."name"`, description: sql`excluded."description"`, pricingType: sql`excluded."pricingType"`, isActive: true, updatedAt: new Date() } });
const configuredBusinessAddons = businessCardProducts.filter((product) => product.supportsPremiumAddons).flatMap((product, productIndex) => addonRows.map((addon, addonIndex) => ({ id: uuidFor(`product-addon:${product.slug}:${addon.code}`), productId: productIds.get(product.slug)!, addonId: addon.id, price: addonIndex === 0 ? "100.00" : "150.00", sortOrder: productIndex * addonRows.length + addonIndex, isActive: true, taxInclusive: true })));
await db.insert(productAddons).values(configuredBusinessAddons).onConflictDoUpdate({ target: productAddons.id, set: { price: sql`excluded."price"`, sortOrder: sql`excluded."sortOrder"`, isActive: true, taxInclusive: true, updatedAt: new Date() } });

function visitingCardPages(slug: string) {
  const frontBack = slug.includes("front-back") || slug.includes("350gsm-matt") || slug.includes("uv-front-back");
  const spotUv = slug.includes("uv") || slug === "business-card-350gsm-matt" || slug === "business-card-nt-front-back";
  const pages = frontBack
    ? [{ pageNumber: 1, label: "Front Design File", required: true }, { pageNumber: 2, label: "Back Design File", required: true }]
    : [{ pageNumber: 1, label: "Design File", required: true }];
  if (spotUv) pages.push({ pageNumber: pages.length + 1, label: "Spot UV File", colorMode: "B&W only", notes: "Include this separation page only when Spot UV is selected.", required: false } as typeof pages[number]);
  pages.push({ pageNumber: pages.length + 1, label: "Foil File", colorMode: "B&W only", notes: "Include this separation page only when foil finishing is selected.", required: false } as typeof pages[number]);
  return pages;
}

const multiplePageInstructions = "Keep all artwork pages in one CDR file and in the displayed order. Use the same 93 x 56 mm full-design size on every page. Front/back jobs must place the front first and back second. Include B&W separation pages only for finishes selected in the order.";
const artworkRows = businessCardProducts.map((product) => ({
  id: uuidFor(`artwork:${product.slug}:product`), productId: productIds.get(product.slug)!, scopeKey: "PRODUCT", artworkRequired: true,
  acceptedFormats: ["CDR"] as Array<"CDR">, maxFileSize: 100, maxFiles: 1, designWidth: "93", designHeight: "56", designUnit: "mm",
  safeAreaWidth: "82", safeAreaHeight: "45", finalWidth: "90", finalHeight: "53", orientation: "ANY", pageInstructions: visitingCardPages(product.slug),
  multiplePageInstructions, additionalInstructions: "Keep all text and important content inside the safe area. Convert fonts to curves and preserve the configured page order in the CDR artwork.",
  notes: "Visiting-card production artwork rule seeded from the standard card specification.", isActive: true,
}));
await db.insert(artworkRequirements).values(artworkRows).onConflictDoUpdate({ target: artworkRequirements.id, set: {
  artworkRequired: sql`excluded."artworkRequired"`, acceptedFormats: sql`excluded."acceptedFormats"`, maxFileSize: sql`excluded."maxFileSize"`, maxFiles: sql`excluded."maxFiles"`,
  designWidth: sql`excluded."designWidth"`, designHeight: sql`excluded."designHeight"`, designUnit: sql`excluded."designUnit"`, safeAreaWidth: sql`excluded."safeAreaWidth"`, safeAreaHeight: sql`excluded."safeAreaHeight"`, finalWidth: sql`excluded."finalWidth"`, finalHeight: sql`excluded."finalHeight"`, orientation: sql`excluded."orientation"`,
  pageInstructions: sql`excluded."pageInstructions"`, multiplePageInstructions: sql`excluded."multiplePageInstructions"`, additionalInstructions: sql`excluded."additionalInstructions"`, notes: sql`excluded."notes"`, isActive: true, updatedAt: new Date(),
} });

const deliveryRows = businessCardProducts.flatMap((product) => [
  { id: uuidFor(`delivery:${product.slug}:pickup`), productId: productIds.get(product.slug)!, deliveryMethod: "PICKUP", stateCode: "*", price: "0.00", sortOrder: 0, isActive: true, taxInclusive: true },
  { id: uuidFor(`delivery:${product.slug}:courier:gj`), productId: productIds.get(product.slug)!, deliveryMethod: "COURIER", stateCode: "GJ", price: "80.00", sortOrder: 1, isActive: true, taxInclusive: true },
  { id: uuidFor(`delivery:${product.slug}:courier:default`), productId: productIds.get(product.slug)!, deliveryMethod: "COURIER", stateCode: "*", price: "120.00", sortOrder: 2, isActive: true, taxInclusive: true },
]);
await db.insert(productDeliveryRules).values(deliveryRows).onConflictDoUpdate({ target: productDeliveryRules.id, set: { price: sql`excluded."price"`, sortOrder: sql`excluded."sortOrder"`, isActive: true, taxInclusive: true, updatedAt: new Date() } });

const imageRows = businessCardProducts.map((product) => ({ id: uuidFor(`image:${product.slug}:primary`), productId: productIds.get(product.slug)!, imageUrl: "/images/mahavir-print-assortment.png", altText: `${product.name} business cards`, sortOrder: 0, isPrimary: true }));
await db.insert(productImages).values(imageRows).onConflictDoUpdate({ target: productImages.id, set: { imageUrl: sql`excluded."imageUrl"`, altText: sql`excluded."altText"`, sortOrder: 0, isPrimary: true, updatedAt: new Date() } });

const sectionRows = businessCardProducts.flatMap((product) => [
  { id: uuidFor(`content:${product.slug}:details`), productId: productIds.get(product.slug)!, title: "Product details", sortOrder: 0 },
  { id: uuidFor(`content:${product.slug}:artwork`), productId: productIds.get(product.slug)!, title: "Artwork notes", sortOrder: 1 },
]);
await db.insert(productContentSections).values(sectionRows).onConflictDoUpdate({ target: productContentSections.id, set: { title: sql`excluded."title"`, sortOrder: sql`excluded."sortOrder"`, updatedAt: new Date() } });
const contentItems = businessCardProducts.flatMap((product) => [
  { id: uuidFor(`content-item:${product.slug}:quantity`), sectionId: uuidFor(`content:${product.slug}:details`), label: "Reference quantity", content: "1,000 cards is configured as the reference quantity.", sortOrder: 0 },
  { id: uuidFor(`content-item:${product.slug}:artwork`), sectionId: uuidFor(`content:${product.slug}:artwork`), label: "Artwork", content: "Supply a final CDR file using the configured design size, safe area, final size, and page order.", sortOrder: 0 },
]);
await db.insert(productContentItems).values(contentItems).onConflictDoUpdate({ target: productContentItems.id, set: { label: sql`excluded."label"`, content: sql`excluded."content"`, sortOrder: sql`excluded."sortOrder"`, updatedAt: new Date() } });

const defaultNotices = [
  {
    id: uuidFor("notice:cdr-artwork"),
    title: "CDR artwork required for applicable products",
    message: "Convert fonts to curves and maintain 93 x 56 mm canvas for business card jobs.",
    tone: "INFO",
    placement: "GLOBAL",
    animationType: "MARQUEE",
    priority: "HIGH",
    linkLabel: "View Products",
    linkUrl: "/products",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: uuidFor("notice:base-prices"),
    title: "Base prices shown",
    message: "GST is charged additionally as applicable on commercial print jobs at checkout.",
    tone: "INFO",
    placement: "GLOBAL",
    animationType: "MARQUEE",
    priority: "NORMAL",
    linkLabel: null,
    linkUrl: null,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: uuidFor("notice:bulk-orders"),
    title: "Business & bulk printing orders welcome",
    message: "Custom quotations available for volume quantities and specialized finishing requirements.",
    tone: "SUCCESS",
    placement: "GLOBAL",
    animationType: "MARQUEE",
    priority: "HIGH",
    linkLabel: "Request Quote",
    linkUrl: "/quote",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: uuidFor("notice:courier-delivery"),
    title: "Gujarat / Rajasthan delivery available",
    message: "Standard courier delivery available on selected product ranges with live dispatch updates.",
    tone: "INFO",
    placement: "GLOBAL",
    animationType: "MARQUEE",
    priority: "NORMAL",
    linkLabel: null,
    linkUrl: null,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: uuidFor("notice:cdr-single-file"),
    title: "Upload one CDR file for applicable card jobs",
    message: "Keep front, back and Spot UV separation pages in a single CorelDRAW file.",
    tone: "WARNING",
    placement: "GLOBAL",
    animationType: "MARQUEE",
    priority: "NORMAL",
    linkLabel: null,
    linkUrl: null,
    sortOrder: 4,
    isActive: true,
  },
];

for (const notice of defaultNotices) {
  await db.insert(notices).values(notice).onConflictDoUpdate({
    target: notices.id,
    set: {
      title: notice.title,
      message: notice.message,
      tone: notice.tone,
      placement: notice.placement,
      animationType: notice.animationType,
      priority: notice.priority,
      linkLabel: notice.linkLabel,
      linkUrl: notice.linkUrl,
      sortOrder: notice.sortOrder,
      isActive: notice.isActive,
      updatedAt: new Date(),
    },
  });
}

const defaultBanners = [
  {
    id: uuidFor("banner:home-hero-sub"),
    title: "Business printing, one place.",
    subtitle: "Visiting cards, carton packaging, custom product labels and commercial stationery.",
    badge: "Commercial Printing",
    ctaLabel: "Browse Products",
    ctaUrl: "/products",
    imageUrl: "/images/mahavir-print-assortment.png",
    storageKey: null,
    placement: "HOME_HERO_BOTTOM",
    animationType: "FADE",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: uuidFor("banner:home-mid"),
    title: "Need bulk printing or custom specifications?",
    subtitle: "Request a tailored quotation for volume runs above 10,000 units, custom packaging, or bespoke finishes.",
    badge: "Bulk Orders & Custom",
    ctaLabel: "Request a Quote",
    ctaUrl: "/quote",
    imageUrl: "/images/mahavir-print-assortment.png",
    storageKey: null,
    placement: "HOME_MID",
    animationType: "SLIDE_UP",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: uuidFor("banner:catalog-top"),
    title: "Upload your CDR artwork",
    subtitle: "Production-ready file guidance: maintain safe margins, 300 DPI resolution, and page hierarchy for flawless offset output.",
    badge: "File Guidance",
    ctaLabel: "Production Guidance",
    ctaUrl: "/quote",
    imageUrl: "/images/mahavir-print-assortment.png",
    storageKey: null,
    placement: "CATALOG_TOP",
    animationType: "FADE",
    sortOrder: 0,
    isActive: true,
  },
  {
    id: uuidFor("banner:cart-checkout"),
    title: "Gujarat & Rajasthan direct courier dispatch",
    subtitle: "Secure packaging, verified dispatch timeline, and local Khadia Golwad store pickup available.",
    badge: "Delivery & Pickup",
    ctaLabel: "View Delivery Options",
    ctaUrl: "/products",
    imageUrl: "/images/mahavir-print-assortment.png",
    storageKey: null,
    placement: "CART_CHECKOUT",
    animationType: "IMAGE_ZOOM",
    sortOrder: 0,
    isActive: true,
  },
];

for (const banner of defaultBanners) {
  await db.insert(banners).values(banner).onConflictDoUpdate({
    target: banners.id,
    set: {
      title: banner.title,
      subtitle: banner.subtitle,
      badge: banner.badge,
      ctaLabel: banner.ctaLabel,
      ctaUrl: banner.ctaUrl,
      imageUrl: banner.imageUrl,
      storageKey: banner.storageKey,
      placement: banner.placement,
      animationType: banner.animationType,
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      updatedAt: new Date(),
    },
  });
}

console.log(`Seeded ${catalogCategories.length} categories, ${allProducts.length} products, and ${pricingValues.length} PDF-derived pricing rules.`);
await pool.end();
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
