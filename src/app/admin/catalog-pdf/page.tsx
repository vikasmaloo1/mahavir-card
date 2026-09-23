import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";

import { getAdminAccess } from "@/lib/permissions";
import { db } from "@/lib/db/server";
import {
  businessSettings,
  categories as categoriesTable,
  pricingRules as pricingRulesTable,
  productImages,
  products as productsTable,
} from "@/lib/db/schema";
import { rateCatalog } from "@/lib/rate-catalog";
import { b2bRateOverrides } from "@/lib/b2b-rate-catalog";
import {
  AdminPriceCatalogDocument,
  type CatalogCategoryGroup,
  type CatalogProductItem,
} from "@/components/admin-price-catalog-document";

export const metadata: Metadata = {
  title: "Price Catalogue & Specification Directory (PDF) | Mahavir Card Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

const productSlugImageMap: Record<string, string> = {
  "nt-single": "/images/products/nt-single.jpg",
  "nt-front-back": "/images/products/nt-front-back.jpg",
  "tearable-single-side": "/images/products/tearable-single.jpg",
  "tearable-front-back-without-lamination": "/images/products/tearable-unlam.jpg",
  "tearable-front-back-with-lamination": "/images/products/tearable-fb-lam.jpg",
  "400-gsm-thermal-matt-single-front-back": "/images/products/thermal-matt-400.jpg",
  "350-gsm-thermal-matt-texture": "/images/products/textured-card-350.jpg",
  "400-gsm-thermal-matt-single-side-uv": "/images/products/thermal-single-uv.jpg",
  "400-gsm-thermal-matt-front-back-uv": "/images/products/thermal-fb-uv.jpg",
  "premium-400-gsm-velvet": "/images/products/round-corner-card.jpg",
  "premium-400-gsm-velvet-single-side-uv": "/images/products/spot-uv-closeup.jpg",
  "premium-400-gsm-velvet-front-back-uv": "/images/products/velvet-raised-uv-macro.jpg",
  "premium-400-gsm-velvet-single-side-foil": "/images/products/velvet-single-foil.jpg",
  "premium-400-gsm-velvet-front-back-foil": "/images/products/velvet-gold-foil-pair.jpg",
  "premium-400-gsm-dripoff-front-back": "/images/products/dripoff-hybrid-card.jpg",
  "art-card-single-side": "/images/products/art-card.jpg",
  "art-card-both-side": "/images/products/art-card-both-side.jpg",
  "art-card-both-side-lamination": "/images/products/art-card-lamination.jpg",
  "letterhead-100-alabaster": "/images/products/letterhead-100-alabaster.jpg",
  "letterhead-80-gsm-ss-finish": "/images/products/letterhead-80-gsm-ss.jpg",
  "letterhead-100-gsm-ss-finish": "/images/products/letterhead-100-ss.jpg",
  "letterhead-100-alabaster-front-back": "/images/products/alabaster-stationery.jpg",
  "envelope-100-alabaster": "/images/products/alabaster-envelope-100.jpg",
  "envelope-80-gsm-ss-finish": "/images/products/envelope-80-ss.jpg",
  "envelope-100-gsm-ss-finish": "/images/products/envelope-100-ss.jpg",
  "cover-a4-130-gsm-art-paper": "/images/products/a4-art-paper-cover.jpg",
  "brochure-a4-single-side": "/images/products/trifold-brochure.jpg",
  "brochure-a4-both-side-without-lamination": "/images/products/brochure-unlaminated-matte.jpg",
  "brochure-a4-both-side-lamination": "/images/products/trifold-brochure-open.jpg",
  "brochure-a8-250-tearable-single-side": "/images/products/a8-mini-brochure.jpg",
  "brochure-a8-250-tearable-front-back": "/images/products/brochure-a8-pocket.jpg",
  "brochure-a8-250-lamination-front-back": "/images/products/trifold-brochure.jpg",
  "leaflet-a4-130-gsm-single-side": "/images/products/flyer-130-art-paper.jpg",
  "leaflet-a4-130-gsm-front-back": "/images/products/leaflet.jpg",
  "leaflet-a4-170-gsm-single-or-front-back": "/images/products/flyer-170-art-paper.jpg",
  "sticker-without-lamination": "/images/products/diecut-stickers.jpg",
  "sticker-with-lamination": "/images/products/sticker-sheet-kisscut.jpg",
  "avery-sticker-without-lamination": "/images/products/avery-vinyl-sticker.jpg",
  "avery-sticker-with-lamination": "/images/products/diecut-stickers.jpg",
};

export default async function AdminCatalogPdfPage() {
  const requestHeaders = await headers();
  const access = await getAdminAccess(new Request("http://localhost/admin", { headers: requestHeaders }));
  if (!access) redirect("/admin/login");

  let settingsRow: typeof businessSettings.$inferSelect | undefined;
  let dbProductsWithCat: Array<{
    product: typeof productsTable.$inferSelect;
    category: { name: string; slug: string } | null;
  }> = [];
  let dbImages: Array<typeof productImages.$inferSelect> = [];
  let dbPricingRules: Array<typeof pricingRulesTable.$inferSelect> = [];

  try {
    const [settings, productsRes] = await Promise.all([
      db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1),
      db
        .select({
          product: productsTable,
          category: {
            name: categoriesTable.name,
            slug: categoriesTable.slug,
          },
        })
        .from(productsTable)
        .leftJoin(categoriesTable, eq(productsTable.categoryId, categoriesTable.id))
        .where(and(eq(productsTable.isActive, true), eq(productsTable.status, "ACTIVE")))
        .orderBy(asc(productsTable.sortOrder), asc(productsTable.name)),
    ]);

    settingsRow = settings[0];
    dbProductsWithCat = productsRes;

    const pIds = dbProductsWithCat.map((p) => p.product.id);
    if (pIds.length > 0) {
      const [imagesRes, rulesRes] = await Promise.all([
        db
          .select()
          .from(productImages)
          .where(inArray(productImages.productId, pIds))
          .orderBy(asc(productImages.sortOrder)),
        db
          .select()
          .from(pricingRulesTable)
          .where(and(inArray(pricingRulesTable.productId, pIds), eq(pricingRulesTable.isActive, true))),
      ]);
      dbImages = imagesRes;
      dbPricingRules = rulesRes;
    }
  } catch (error) {
    console.error("Error querying DB in catalog-pdf:", error);
  }

  // Build a lookup map of DB products by slug
  const dbProductBySlug = new Map<string, (typeof dbProductsWithCat)[number]>();
  for (const item of dbProductsWithCat) {
    dbProductBySlug.set(item.product.slug, item);
  }

  // Build an image lookup map by productId
  const primaryImageByProductId = new Map<string, string>();
  for (const img of dbImages) {
    if (!primaryImageByProductId.has(img.productId) || img.isPrimary) {
      primaryImageByProductId.set(img.productId, img.imageUrl);
    }
  }

  // Build the unified category groups using rateCatalog as master template, enriched by DB
  const categoryGroups: CatalogCategoryGroup[] = rateCatalog.map((cat) => {
    const products: CatalogProductItem[] = cat.items.map((item) => {
      const dbEntry = dbProductBySlug.get(item.slug);
      const dbProduct = dbEntry?.product;

      // Determine the 1 product image:
      let imageUrl = productSlugImageMap[item.slug] || "/images/home-hero-printing.jpg";
      if (dbProduct) {
        const uploadedImg = primaryImageByProductId.get(dbProduct.id);
        if (uploadedImg) {
          imageUrl = uploadedImg;
        } else if (dbProduct.imageUrl && !dbProduct.imageUrl.includes("category")) {
          imageUrl = dbProduct.imageUrl;
        }
      }

      // Check B2B override
      const b2bOverride = b2bRateOverrides[item.slug];

      return {
        id: dbProduct?.id || item.slug,
        name: dbProduct?.name || item.name,
        slug: item.slug,
        categorySlug: cat.slug,
        categoryName: cat.name,
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
        addon: item.addon,
        bladeCharge: item.bladeCharge,
        minimumArea: item.minimumArea,
        minimumCharge: item.minimumCharge,
        delivery: item.delivery,
      };
    });

    return {
      slug: cat.slug,
      name: cat.name,
      description: cat.description,
      products,
    };
  });

  const businessInfo = {
    name: settingsRow?.businessName || "MAHAVIR CARD",
    tagline: settingsRow?.footerText || "ALL PRINTING SOLUTIONS & PAPER CUTTING",
    address: [settingsRow?.addressLine1, settingsRow?.addressLine2].filter(Boolean).join(", ") || "Khadia Golwad, Opp. Jain Digamber Mandir",
    city: settingsRow?.city || "Ahmedabad",
    state: settingsRow?.state || "Gujarat",
    postalCode: settingsRow?.postalCode || "380001",
    phone: "+91 79847 52154 / " + (settingsRow?.phone || "+91 94263 71150"),
    email: settingsRow?.email || "mahavircard2011@gmail.com",
    website: "www.mahavircard.in",
    gstin: settingsRow?.gstNumber || "24AIUPJ2271L1ZV",
    stateCode: "24 (Gujarat)",
  };

  return (
    <AdminPriceCatalogDocument
      categories={categoryGroups}
      businessInfo={businessInfo}
    />
  );
}
