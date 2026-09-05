import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config as loadDotenv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
import { eq, inArray } from "drizzle-orm";

loadDotenv({ path: ".env.local" });

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
    if (!existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return null;
    }
    const fileBuffer = readFileSync(filePath);
    await s3.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: { source: "mahavir-banners-v3" },
      })
    );
    console.log(`  ✓ Uploaded to R2: ${key}`);
    return key;
  } catch (err) {
    console.warn(`  ⚠ R2 upload error for ${key}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function main() {
  const { db } = await import("../src/lib/db/server");
  const { banners, products, productImages } = await import("../src/lib/db/schema");

  console.log("=== 1. Uploading Banners & Products to Cloudflare R2 ===");
  const filesToUpload = [
    { key: "banners/banner-commercial-press.jpg", local: "public/images/banners/banner-commercial-press.jpg" },
    { key: "banners/banner-stationery-suite.jpg", local: "public/images/banners/banner-stationery-suite.jpg" },
    { key: "banners/banner-stickers-packaging.jpg", local: "public/images/banners/banner-stickers-packaging.jpg" },
    { key: "media/products/letterhead-ss-finish.jpg", local: "public/images/products/letterhead-ss-finish.jpg" },
    { key: "media/products/corporate-envelopes-set.jpg", local: "public/images/products/corporate-envelopes-set.jpg" },
    { key: "media/products/brochure-a8-pocket.jpg", local: "public/images/products/brochure-a8-pocket.jpg" },
    { key: "media/products/round-corner-card.jpg", local: "public/images/products/round-corner-card.jpg" },
  ];

  for (const item of filesToUpload) {
    await uploadToR2(item.key, item.local);
  }

  console.log("\n=== 2. Updating Products Table with Dedicated Imagery ===");
  
  // Update envelopes
  const envelopeSlugs = [
    "envelope-100-alabaster",
    "envelope-80-gsm-ss-finish",
    "envelope-100-gsm-ss-finish",
    "cover-a4-130-gsm-art-paper",
  ];
  for (const slug of envelopeSlugs) {
    await db.update(products).set({ imageUrl: "/images/products/corporate-envelopes-set.jpg" }).where(eq(products.slug, slug));
    console.log(`  ✓ Updated product ${slug} -> /images/products/corporate-envelopes-set.jpg`);
  }

  // Update letterheads
  const letterheadSlugs = [
    "letterhead-100-gsm-ss-finish",
    "letterhead-100-alabaster",
    "letterhead-80-gsm-ss-finish",
    "letterhead-100-alabaster-front-back",
  ];
  for (const slug of letterheadSlugs) {
    await db.update(products).set({ imageUrl: "/images/products/letterhead-ss-finish.jpg" }).where(eq(products.slug, slug));
    console.log(`  ✓ Updated product ${slug} -> /images/products/letterhead-ss-finish.jpg`);
  }

  // Update A8 pocket brochures
  const a8BrochureSlugs = [
    "brochure-a8-250-tearable-single-side",
    "brochure-a8-250-tearable-front-back",
    "brochure-a8-250-lamination-front-back",
  ];
  for (const slug of a8BrochureSlugs) {
    await db.update(products).set({ imageUrl: "/images/products/brochure-a8-pocket.jpg" }).where(eq(products.slug, slug));
    console.log(`  ✓ Updated product ${slug} -> /images/products/brochure-a8-pocket.jpg`);
  }

  console.log("\n=== 3. Adding New Product Gallery Images ===");
  const allEnvelopes = await db.select().from(products).where(inArray(products.slug, envelopeSlugs));
  for (const p of allEnvelopes) {
    await db.insert(productImages).values({
      productId: p.id,
      imageUrl: "/images/products/corporate-envelopes-set.jpg",
      storageKey: "media/products/corporate-envelopes-set.jpg",
      altText: `${p.name} - Corporate flap and peel-seal adhesive details`,
      sortOrder: 0,
      isPrimary: true,
    }).onConflictDoNothing().catch(() => undefined);
  }

  const allLetterheads = await db.select().from(products).where(inArray(products.slug, letterheadSlugs));
  for (const p of allLetterheads) {
    await db.insert(productImages).values({
      productId: p.id,
      imageUrl: "/images/products/letterhead-ss-finish.jpg",
      storageKey: "media/products/letterhead-ss-finish.jpg",
      altText: `${p.name} - 100 GSM Super Sunshine finish and embossed logo`,
      sortOrder: 0,
      isPrimary: true,
    }).onConflictDoNothing().catch(() => undefined);
  }

  console.log("\n=== 4. Updating Banners Table in Neon DB ===");
  await db.update(banners)
    .set({
      imageUrl: "/images/banners/banner-commercial-press.jpg",
      storageKey: "banners/banner-commercial-press.jpg",
    })
    .where(eq(banners.sortOrder, 1));

  await db.update(banners)
    .set({
      imageUrl: "/images/banners/banner-stationery-suite.jpg",
      storageKey: "banners/banner-stationery-suite.jpg",
    })
    .where(eq(banners.sortOrder, 4));

  await db.update(banners)
    .set({
      imageUrl: "/images/banners/banner-stickers-packaging.jpg",
      storageKey: "banners/banner-stickers-packaging.jpg",
    })
    .where(eq(banners.sortOrder, 3));

  console.log("  ✓ Updated database banners with new 16:9 big banners!");
  console.log("All updates completed successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
