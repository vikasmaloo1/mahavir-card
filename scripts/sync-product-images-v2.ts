import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config as loadDotenv } from "dotenv";
import { readFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { eq } from "drizzle-orm";

loadDotenv({ path: ".env.local" });

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "600aea3784ced4b6aa2298e9304a5ec7";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "e687ccf05cec3306e7becf8a6d384f7c";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "a9ec66b4688943731fdaebb3dd7fc2537d890750985a2c33e38f6536b6ac9cca";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "mahavir-card-prod";
const R2_ENDPOINT = process.env.R2_ENDPOINT || "https://600aea3784ced4b6aa2298e9304a5ec7.r2.cloudflarestorage.com";

const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(key: string, filePath: string, contentType = "image/jpeg") {
  try {
    const fileBuffer = readFileSync(filePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: { source: "mahavir-product-images-v2" },
      })
    );
    console.log(`  ✓ R2: ${key}`);
    return key;
  } catch (err: any) {
    console.warn(`  ⚠ R2 upload note for ${key}:`, err.message);
    return null;
  }
}

const brainDir = "C:\\Users\\Vikas\\.gemini\\antigravity\\brain\\043843d2-2090-44d1-994c-2bfd8a23e4c9";

const imageMappings: Array<{ brainFile: string; destFilename: string }> = [
  { brainFile: "nt_single_card_1788376040622.jpg", destFilename: "nt-single.jpg" },
  { brainFile: "nt_front_back_1788376058254.jpg", destFilename: "nt-front-back.jpg" },
  { brainFile: "tearable_single_1788376070540.jpg", destFilename: "tearable-single.jpg" },
  { brainFile: "tearable_fb_lam_1788376084144.jpg", destFilename: "tearable-fb-lam.jpg" },
  { brainFile: "tearable_unlam_1788376176539.jpg", destFilename: "tearable-unlam.jpg" },
  { brainFile: "thermal_matt_400_1788376099156.jpg", destFilename: "thermal-matt-400.jpg" },
  { brainFile: "thermal_single_uv_1788376121575.jpg", destFilename: "thermal-single-uv.jpg" },
  { brainFile: "thermal_fb_uv_1788376151923.jpg", destFilename: "thermal-fb-uv.jpg" },
  { brainFile: "textured_card_350_1788376164695.jpg", destFilename: "textured-card-350.jpg" },
  { brainFile: "diecut_stickers_1788376197621.jpg", destFilename: "diecut-stickers.jpg" },
  { brainFile: "trifold_brochure_1788376310570.jpg", destFilename: "trifold-brochure.jpg" },
  { brainFile: "velvet_foil_card_1788376323006.jpg", destFilename: "velvet-foil-card.jpg" },
  { brainFile: "alabaster_stationery_1788376339179.jpg", destFilename: "alabaster-stationery.jpg" },
  { brainFile: "art_card_cat_1788354557178.jpg", destFilename: "art-card.jpg" },
  { brainFile: "leaflet_cat_1788354780067.jpg", destFilename: "leaflet.jpg" },
  { brainFile: "spot_uv_closeup_1788356044768.jpg", destFilename: "spot-uv-closeup.jpg" },
];

async function main() {
  console.log("=== Copying and Syncing AI Images to Products ===");
  const destDir = join(process.cwd(), "public", "images", "products");
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  for (const { brainFile, destFilename } of imageMappings) {
    const src = join(brainDir, brainFile);
    const dst = join(destDir, destFilename);
    if (existsSync(src)) {
      copyFileSync(src, dst);
      console.log(`Copied ${brainFile} -> public/images/products/${destFilename}`);
      await uploadToR2(`media/products/${destFilename}`, dst);
    } else {
      console.warn(`Source file missing: ${src}`);
    }
  }

  // Database updates
  const { db } = await import("../src/lib/db/server");
  const { products, productImages } = await import("../src/lib/db/schema");

  // Per-product custom mapping
  const productCustomImages: Record<string, { primary: string; additional: string[] }> = {
    // Visiting cards (Exact specific renders)
    "nt-single": {
      primary: "/images/products/nt-single.jpg",
      additional: ["/images/products/nt-front-back.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "nt-front-back": {
      primary: "/images/products/nt-front-back.jpg",
      additional: ["/images/products/nt-single.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "tearable-single-side": {
      primary: "/images/products/tearable-single.jpg",
      additional: ["/images/products/tearable-unlam.jpg", "/images/products/art-card.jpg"],
    },
    "tearable-front-back-without-lamination": {
      primary: "/images/products/tearable-unlam.jpg",
      additional: ["/images/products/tearable-single.jpg", "/images/products/tearable-fb-lam.jpg"],
    },
    "tearable-front-back-with-lamination": {
      primary: "/images/products/tearable-fb-lam.jpg",
      additional: ["/images/products/tearable-unlam.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "400-gsm-thermal-matt-single-front-back": {
      primary: "/images/products/thermal-matt-400.jpg",
      additional: ["/images/products/thermal-single-uv.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "400-gsm-thermal-matt-single-side-uv": {
      primary: "/images/products/thermal-single-uv.jpg",
      additional: ["/images/products/thermal-fb-uv.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "400-gsm-thermal-matt-front-back-uv": {
      primary: "/images/products/thermal-fb-uv.jpg",
      additional: ["/images/products/thermal-single-uv.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "350-gsm-thermal-matt-texture": {
      primary: "/images/products/textured-card-350.jpg",
      additional: ["/images/products/thermal-matt-400.jpg", "/images/products/spot-uv-closeup.jpg"],
    },

    // Premium Cards
    "premium-400-gsm-velvet": {
      primary: "/images/products/velvet-foil-card.jpg",
      additional: ["/images/products/thermal-single-uv.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "premium-400-gsm-velvet-single-side-uv": {
      primary: "/images/products/thermal-single-uv.jpg",
      additional: ["/images/products/velvet-foil-card.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "premium-400-gsm-velvet-front-back-uv": {
      primary: "/images/products/thermal-fb-uv.jpg",
      additional: ["/images/products/velvet-foil-card.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "premium-400-gsm-velvet-single-side-foil": {
      primary: "/images/products/velvet-foil-card.jpg",
      additional: ["/images/products/spot-uv-closeup.jpg", "/images/products/thermal-matt-400.jpg"],
    },
    "premium-400-gsm-velvet-front-back-foil": {
      primary: "/images/products/velvet-foil-card.jpg",
      additional: ["/images/products/spot-uv-closeup.jpg", "/images/products/thermal-fb-uv.jpg"],
    },
    "premium-400-gsm-dripoff-front-back": {
      primary: "/images/products/thermal-fb-uv.jpg",
      additional: ["/images/products/textured-card-350.jpg", "/images/products/spot-uv-closeup.jpg"],
    },

    // Stickers
    "sticker-without-lamination": {
      primary: "/images/products/diecut-stickers.jpg",
      additional: ["/images/sticker-category.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "sticker-with-lamination": {
      primary: "/images/products/diecut-stickers.jpg",
      additional: ["/images/sticker-category.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "avery-sticker-without-lamination": {
      primary: "/images/products/diecut-stickers.jpg",
      additional: ["/images/sticker-category.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "avery-sticker-with-lamination": {
      primary: "/images/products/diecut-stickers.jpg",
      additional: ["/images/sticker-category.jpg", "/images/products/spot-uv-closeup.jpg"],
    },

    // Brochures
    "brochure-a4-single-side": {
      primary: "/images/products/trifold-brochure.jpg",
      additional: ["/images/brochure-category.jpg", "/images/products/art-card.jpg"],
    },
    "brochure-a4-both-side-without-lamination": {
      primary: "/images/products/trifold-brochure.jpg",
      additional: ["/images/brochure-category.jpg", "/images/products/art-card.jpg"],
    },
    "brochure-a4-both-side-lamination": {
      primary: "/images/products/trifold-brochure.jpg",
      additional: ["/images/brochure-category.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "brochure-a8-250-tearable-single-side": {
      primary: "/images/products/trifold-brochure.jpg",
      additional: ["/images/brochure-category.jpg", "/images/products/art-card.jpg"],
    },
    "brochure-a8-250-tearable-front-back": {
      primary: "/images/products/trifold-brochure.jpg",
      additional: ["/images/brochure-category.jpg", "/images/products/art-card.jpg"],
    },
    "brochure-a8-250-lamination-front-back": {
      primary: "/images/products/trifold-brochure.jpg",
      additional: ["/images/brochure-category.jpg", "/images/products/spot-uv-closeup.jpg"],
    },

    // Art Card
    "art-card-single-side": {
      primary: "/images/products/art-card.jpg",
      additional: ["/images/products/tearable-single.jpg", "/images/art-card-category.jpg"],
    },
    "art-card-both-side": {
      primary: "/images/products/art-card.jpg",
      additional: ["/images/products/tearable-unlam.jpg", "/images/art-card-category.jpg"],
    },
    "art-card-both-side-lamination": {
      primary: "/images/products/art-card.jpg",
      additional: ["/images/products/tearable-fb-lam.jpg", "/images/products/spot-uv-closeup.jpg"],
    },

    // Letterhead & Envelope
    "letterhead-80-gsm-ss-finish": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/art-card.jpg"],
    },
    "letterhead-100-gsm-ss-finish": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/art-card.jpg"],
    },
    "letterhead-100-alabaster": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/art-card.jpg"],
    },
    "letterhead-100-alabaster-front-back": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/art-card.jpg"],
    },
    "envelope-80-gsm-ss-finish": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/art-card.jpg"],
    },
    "envelope-100-gsm-ss-finish": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/art-card.jpg"],
    },
    "envelope-100-alabaster": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/art-card.jpg"],
    },
    "cover-a4-130-gsm-art-paper": {
      primary: "/images/products/alabaster-stationery.jpg",
      additional: ["/images/letterhead-envelope-category.jpg", "/images/products/leaflet.jpg"],
    },

    // Leaflet
    "leaflet-a4-130-gsm-single-side": {
      primary: "/images/products/leaflet.jpg",
      additional: ["/images/leaflet-category.jpg", "/images/products/art-card.jpg"],
    },
    "leaflet-a4-130-gsm-front-back": {
      primary: "/images/products/leaflet.jpg",
      additional: ["/images/leaflet-category.jpg", "/images/products/art-card.jpg"],
    },
    "leaflet-a4-170-gsm-single-or-front-back": {
      primary: "/images/products/leaflet.jpg",
      additional: ["/images/leaflet-category.jpg", "/images/products/art-card.jpg"],
    },
  };

  console.log("\nUpdating products and product_images in PostgreSQL...");
  const allProducts = await db.select().from(products);
  let updatedCount = 0;

  for (const prod of allProducts) {
    const custom = productCustomImages[prod.slug];
    if (custom) {
      // 1. Update primary imageUrl
      await db
        .update(products)
        .set({ imageUrl: custom.primary, updatedAt: new Date() })
        .where(eq(products.id, prod.id));

      // 2. Clear previous images and insert fresh set
      await db.delete(productImages).where(eq(productImages.productId, prod.id));

      // Insert primary
      await db.insert(productImages).values({
        productId: prod.id,
        imageUrl: custom.primary,
        altText: `${prod.name} - Primary Product View`,
        sortOrder: 0,
        isPrimary: true,
      });

      // Insert additional
      for (let i = 0; i < custom.additional.length; i++) {
        await db.insert(productImages).values({
          productId: prod.id,
          imageUrl: custom.additional[i],
          altText: `${prod.name} - Detail Angle & Texture ${i + 1}`,
          sortOrder: i + 1,
          isPrimary: false,
        });
      }

      updatedCount++;
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount} products with custom AI images and multi-photo slideshow galleries!`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync error:", err);
  process.exit(1);
});
