import type { Metadata } from "next";
import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/server";
import {
  businessSettings,
  categories as categoriesTable,
  productImages,
  products as productsTable,
} from "@/lib/db/schema";
import { rateCatalog } from "@/lib/rate-catalog";
import { b2bRateOverrides } from "@/lib/b2b-rate-catalog";
import {
  PublicProductCatalog,
  type PublicCatalogCategory,
  type PublicCatalogProduct,
} from "@/components/public-product-catalog";

export const metadata: Metadata = {
  title: "Official Product Catalogue & Price List | Mahavir Card Ahmedabad",
  description:
    "Explore Mahavir Card's complete commercial printing catalogue with authentic product photos, specifications, and live price ranges. Visiting cards, stationery, brochures, and custom publications. Call / WhatsApp +91 79847 52154.",
  alternates: {
    canonical: "/catalog",
  },
  openGraph: {
    title: "Official Product & Rate Catalogue | Mahavir Card Ahmedabad",
    description:
      "Commercial offset printing catalogue with photos & price ranges. Visiting cards, envelopes, brochures, stickers & packaging. Direct helpline: +91 79847 52154.",
    url: "https://mahavircard.in/catalog",
    images: [
      {
        url: "/images/products/velvet-gold-foil-pair.jpg",
        width: 1200,
        height: 630,
        alt: "Mahavir Card Printing Catalogue",
      },
    ],
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicCatalogPage() {
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
      dbImages = await db
        .select()
        .from(productImages)
        .where(inArray(productImages.productId, pIds))
        .orderBy(asc(productImages.sortOrder));
    }
  } catch (error) {
    console.error("Error querying DB for public catalogue:", error);
  }

  // Lookup map of DB products by slug
  const dbProductBySlug = new Map<string, (typeof dbProductsWithCat)[number]>();
  for (const item of dbProductsWithCat) {
    dbProductBySlug.set(item.product.slug, item);
  }

  // Primary image lookup map by productId:
  // Priority 1: image with isPrimary = true. If not present, the first image ordered by sortOrder.
  const primaryImageByProductId = new Map<string, string>();
  for (const img of dbImages) {
    if (img.isPrimary) {
      primaryImageByProductId.set(img.productId, img.imageUrl);
    }
  }
  for (const img of dbImages) {
    if (!primaryImageByProductId.has(img.productId)) {
      primaryImageByProductId.set(img.productId, img.imageUrl);
    }
  }

  // Build unified categories using rateCatalog as master template, enriched by DB
  const categories: PublicCatalogCategory[] = rateCatalog.map((cat) => {
    const products: PublicCatalogProduct[] = cat.items.map((item) => {
      const dbEntry = dbProductBySlug.get(item.slug);
      const dbProduct = dbEntry?.product;

      // Determine 1st photo of each product (Priority 1 from DB productImages)
      let imageUrl = "/images/home-hero-printing.jpg";
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
    tagline: settingsRow?.footerText || "Commercial Offset Printing & Paper Cutting Hub",
    address: [settingsRow?.addressLine1, settingsRow?.addressLine2].filter(Boolean).join(", ") || "Khadia Golwad, Opp. Jain Digamber Mandir",
    city: settingsRow?.city || "Ahmedabad",
    state: settingsRow?.state || "Gujarat",
    postalCode: settingsRow?.postalCode || "380001",
    primaryPhone: settingsRow?.phone || "+91 94263 71150",
    whatsappPhone: "+91 79847 52154",
    email: settingsRow?.email || "mahavircard2011@gmail.com",
    website: "www.mahavircard.in",
    gstin: settingsRow?.gstNumber || "24AIUPJ2271L1ZV",
  };

  return <PublicProductCatalog categories={categories} businessInfo={businessInfo} />;
}
