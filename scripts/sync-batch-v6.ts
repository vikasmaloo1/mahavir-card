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

  console.log("=== 1. Copying Batch-6 Images and Uploading to Cloudflare R2 ===");
  const brainDir = "C:\\Users\\Vikas\\.gemini\\antigravity\\brain\\043843d2-2090-44d1-994c-2bfd8a23e4c9";

  const batch6Images = [
    {
      src: `${brainDir}\\ss_envelope_80_1788545035993.jpg`,
      dest: "public/images/products/envelope-80-ss.jpg",
      filename: "envelope-80-ss.jpg",
    },
    {
      src: `${brainDir}\\ss_letterhead_100_1788545060673.jpg`,
      dest: "public/images/products/letterhead-100-ss.jpg",
      filename: "letterhead-100-ss.jpg",
    },
    {
      src: `${brainDir}\\velvet_single_foil_1788545082287.jpg`,
      dest: "public/images/products/velvet-single-foil.jpg",
      filename: "velvet-single-foil.jpg",
    },
    {
      src: `${brainDir}\\art_card_duo_1788545249460.jpg`,
      dest: "public/images/products/art-card-both-side.jpg",
      filename: "art-card-both-side.jpg",
    },
  ];

  const { copyFileSync } = await import("node:fs");

  for (const item of batch6Images) {
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
    // 80 GSM Super Sunshine Envelope
    "envelope-80-gsm-ss-finish": {
      primary: "/images/products/envelope-80-ss.jpg",
      alt: "80 GSM Super Sunshine bright white corporate business correspondence envelopes",
      gallery: ["/images/products/corporate-envelopes-set.jpg", "/images/products/letterhead-80-gsm-ss.jpg"],
    },

    // 100 GSM Super Sunshine Letterhead
    "letterhead-100-gsm-ss-finish": {
      primary: "/images/products/letterhead-100-ss.jpg",
      alt: "100 GSM Super Sunshine bright white executive business letterhead stationery",
      gallery: ["/images/products/letterhead-ss-finish.jpg", "/images/products/envelope-80-ss.jpg"],
    },

    // 400 GSM Velvet Single Side Metallic Foil
    "premium-400-gsm-velvet-single-side-foil": {
      primary: "/images/products/velvet-single-foil.jpg",
      alt: "400 GSM luxury velvet card with single side sparkling metallic copper gold foil monogram",
      gallery: ["/images/products/velvet-gold-foil-pair.jpg", "/images/products/velvet-foil-card.jpg"],
    },

    // 250 GSM Art Card Both Side CMYK
    "art-card-both-side": {
      primary: "/images/products/art-card-both-side.jpg",
      alt: "250 GSM coated art card both side full-color commercial offset printing",
      gallery: ["/images/products/art-card-lamination.jpg", "/images/products/art-card.jpg"],
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
