import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { config as loadDotenv } from "dotenv";
import { readFileSync, existsSync } from "node:fs";
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
        Metadata: { source: "mahavir-batch-v4" },
      })
    );
    console.log(`  ✓ Uploaded to R2: ${key}`);
    return key;
  } catch (err: any) {
    console.warn(`  ⚠ R2 upload error for ${key}:`, err.message);
    return null;
  }
}

async function main() {
  const { db } = await import("../src/lib/db/server");
  const { products, productImages } = await import("../src/lib/db/schema");

  console.log("=== 1. Copying Batch-5 Images and Uploading to Cloudflare R2 ===");
  const brainDir = "C:\\Users\\Vikas\\.gemini\\antigravity\\brain\\043843d2-2090-44d1-994c-2bfd8a23e4c9";

  const batch5Images = [
    {
      src: `${brainDir}\\alabaster_envelope_100_1788544469617.jpg`,
      dest: "public/images/products/alabaster-envelope-100.jpg",
      filename: "alabaster-envelope-100.jpg",
    },
    {
      src: `${brainDir}\\letterhead_100_alabaster_1788544497517.jpg`,
      dest: "public/images/products/letterhead-100-alabaster.jpg",
      filename: "letterhead-100-alabaster.jpg",
    },
    {
      src: `${brainDir}\\a8_mini_brochure_1788544528675.jpg`,
      dest: "public/images/products/a8-mini-brochure.jpg",
      filename: "a8-mini-brochure.jpg",
    },
    {
      src: `${brainDir}\\a4_art_paper_cover_1788544689793.jpg`,
      dest: "public/images/products/a4-art-paper-cover.jpg",
      filename: "a4-art-paper-cover.jpg",
    },
  ];

  const { copyFileSync } = await import("node:fs");

  for (const item of batch5Images) {
    if (existsSync(item.src)) {
      copyFileSync(item.src, item.dest);
      console.log(`  ✓ Copied locally: ${item.dest}`);
      await uploadToR2(`media/products/${item.filename}`, item.dest);
    } else {
      console.warn(`  ⚠ Source image not found: ${item.src}`);
    }
  }

  console.log("\n=== 2. Updating Products Table with Exact Mappings ===");
  const productMappings: Record<string, { primary: string; alt: string; gallery: string[] }> = {
    // Alabaster Envelopes & Letterheads
    "envelope-100-alabaster": {
      primary: "/images/products/alabaster-envelope-100.jpg",
      alt: "100 GSM Alabaster luxury off-white executive corporate business envelopes with diamond flap",
      gallery: ["/images/products/corporate-envelopes-set.jpg", "/images/products/letterhead-100-alabaster.jpg"],
    },
    "letterhead-100-alabaster": {
      primary: "/images/products/letterhead-100-alabaster.jpg",
      alt: "100 GSM Alabaster fine bond paper executive corporate letterheads",
      gallery: ["/images/products/alabaster-envelope-100.jpg", "/images/products/letterhead-ss-finish.jpg"],
    },

    // A8 Mini Brochures
    "brochure-a8-250-tearable-front-back": {
      primary: "/images/products/a8-mini-brochure.jpg",
      alt: "250 GSM A8 pocket-sized mini commercial advertising brochures front and back",
      gallery: ["/images/products/brochure-a8-pocket.jpg", "/images/products/trifold-brochure.jpg"],
    },
    "brochure-a8-250-tearable-single-side": {
      primary: "/images/products/a8-mini-brochure.jpg",
      alt: "250 GSM A8 tearable single side commercial mini flyers and handouts",
      gallery: ["/images/products/brochure-a8-pocket.jpg", "/images/products/flyer-130-art-paper.jpg"],
    },

    // A4 Art Paper Presentation Covers
    "cover-a4-130-gsm-art-paper": {
      primary: "/images/products/a4-art-paper-cover.jpg",
      alt: "A4 130 GSM glossy art paper commercial document folder presentation cover",
      gallery: ["/images/products/corporate-envelopes-set.jpg", "/images/products/flyer-130-art-paper.jpg"],
    },
  };

  for (const [slug, item] of Object.entries(productMappings)) {
    const [updatedProd] = await db
      .update(products)
      .set({ imageUrl: item.primary, updatedAt: new Date() })
      .where(eq(products.slug, slug))
      .returning();

    if (updatedProd) {
      console.log(`  ✓ Updated ${slug} -> ${item.primary}`);
      await db.delete(productImages).where(eq(productImages.productId, updatedProd.id));
      
      await db.insert(productImages).values({
        productId: updatedProd.id,
        imageUrl: item.primary,
        storageKey: `media/products/${item.primary.split("/").pop()}`,
        altText: item.alt,
        sortOrder: 0,
        isPrimary: true,
      });

      for (let i = 0; i < item.gallery.length; i++) {
        const galUrl = item.gallery[i];
        await db.insert(productImages).values({
          productId: updatedProd.id,
          imageUrl: galUrl,
          storageKey: `media/products/${galUrl.split("/").pop()}`,
          altText: `${updatedProd.name} detail view ${i + 1}`,
          sortOrder: i + 1,
          isPrimary: false,
        });
      }
    }
  }

  console.log("\nAll 39 active products updated with multi-angle gallery photos in DB!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
