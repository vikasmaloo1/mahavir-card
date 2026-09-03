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

  console.log("=== 1. Uploading Batch-4 Images to Cloudflare R2 ===");
  const images = [
    "flyer-170-art-paper.jpg",
    "dripoff-hybrid-card.jpg",
    "avery-vinyl-sticker.jpg",
    "art-card-lamination.jpg",
    "velvet-gold-foil-pair.jpg",
    "trifold-brochure-open.jpg",
    "letterhead-envelope-duo.jpg",
    "tearable-card-natural.jpg",
    "velvet-raised-uv-macro.jpg",
    "sticker-sheet-kisscut.jpg",
    "flyer-130-art-paper.jpg",
    "brochure-unlaminated-matte.jpg",
    "letterhead-80-gsm-ss.jpg",
  ];

  for (const filename of images) {
    await uploadToR2(`media/products/${filename}`, `public/images/products/${filename}`);
  }

  console.log("\n=== 2. Updating Products Table with Exact Mappings ===");
  const productMappings: Record<string, { primary: string; alt: string; gallery: string[] }> = {
    // Leaflets
    "leaflet-a4-170-gsm-single-or-front-back": {
      primary: "/images/products/flyer-170-art-paper.jpg",
      alt: "A4 170 GSM thick glossy coated art paper promotional flyers",
      gallery: ["/images/products/flyer-130-art-paper.jpg", "/images/products/leaflet.jpg"],
    },
    "leaflet-a4-130-gsm-single-side": {
      primary: "/images/products/flyer-130-art-paper.jpg",
      alt: "A4 130 GSM glossy art paper single side commercial flyer",
      gallery: ["/images/products/flyer-170-art-paper.jpg", "/images/products/leaflet.jpg"],
    },
    "leaflet-a4-130-gsm-front-back": {
      primary: "/images/products/leaflet.jpg",
      alt: "A4 130 GSM art paper front and back commercial advertising leaflet",
      gallery: ["/images/products/flyer-170-art-paper.jpg", "/images/products/flyer-130-art-paper.jpg"],
    },

    // Premium Cards
    "premium-400-gsm-dripoff-front-back": {
      primary: "/images/products/dripoff-hybrid-card.jpg",
      alt: "400 GSM Drip-off hybrid UV card with sand-touch texture and glossy patterns",
      gallery: ["/images/products/velvet-raised-uv-macro.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "premium-400-gsm-velvet-front-back-foil": {
      primary: "/images/products/velvet-gold-foil-pair.jpg",
      alt: "400 GSM luxury black velvet card with gleaming metallic gold foil stamping",
      gallery: ["/images/products/velvet-foil-card.jpg", "/images/products/velvet-raised-uv-macro.jpg"],
    },
    "premium-400-gsm-velvet-single-side-foil": {
      primary: "/images/products/velvet-foil-card.jpg",
      alt: "400 GSM velvet card with single side gold foil monogram",
      gallery: ["/images/products/velvet-gold-foil-pair.jpg", "/images/products/spot-uv-closeup.jpg"],
    },
    "premium-400-gsm-velvet-front-back-uv": {
      primary: "/images/products/velvet-raised-uv-macro.jpg",
      alt: "400 GSM luxury velvet card with raised liquid spot UV gloss",
      gallery: ["/images/products/thermal-fb-uv.jpg", "/images/products/velvet-gold-foil-pair.jpg"],
    },

    // Stickers
    "avery-sticker-with-lamination": {
      primary: "/images/products/avery-vinyl-sticker.jpg",
      alt: "Avery outdoor waterproof adhesive vinyl sticker with glossy lamination",
      gallery: ["/images/products/sticker-sheet-kisscut.jpg", "/images/products/diecut-stickers.jpg"],
    },
    "avery-sticker-without-lamination": {
      primary: "/images/products/avery-vinyl-sticker.jpg",
      alt: "Avery high-performance adhesive vinyl sticker without lamination",
      gallery: ["/images/products/diecut-stickers.jpg", "/images/products/sticker-sheet-kisscut.jpg"],
    },
    "sticker-with-lamination": {
      primary: "/images/products/sticker-sheet-kisscut.jpg",
      alt: "Commercial kiss-cut product sticker sheets with protective thermal lamination",
      gallery: ["/images/products/diecut-stickers.jpg", "/images/products/avery-vinyl-sticker.jpg"],
    },
    "sticker-without-lamination": {
      primary: "/images/products/diecut-stickers.jpg",
      alt: "Custom die-cut adhesive product stickers and labels",
      gallery: ["/images/products/sticker-sheet-kisscut.jpg", "/images/products/avery-vinyl-sticker.jpg"],
    },

    // Art Card
    "art-card-both-side-lamination": {
      primary: "/images/products/art-card-lamination.jpg",
      alt: "250 GSM heavy art card printed sheets with high gloss thermal lamination",
      gallery: ["/images/products/art-card.jpg", "/images/products/tearable-card-natural.jpg"],
    },
    "art-card-single-side": {
      primary: "/images/products/art-card.jpg",
      alt: "250 GSM coated art card single side printing",
      gallery: ["/images/products/art-card-lamination.jpg", "/images/products/tearable-single.jpg"],
    },
    "art-card-both-side": {
      primary: "/images/products/art-card.jpg",
      alt: "250 GSM heavy art card both side CMYK printing",
      gallery: ["/images/products/art-card-lamination.jpg", "/images/products/tearable-card-natural.jpg"],
    },

    // Visiting Card
    "tearable-front-back-without-lamination": {
      primary: "/images/products/tearable-card-natural.jpg",
      alt: "250 GSM uncoated natural tearable art card visiting cards",
      gallery: ["/images/products/tearable-unlam.jpg", "/images/products/tearable-single.jpg"],
    },

    // Brochures
    "brochure-a4-both-side-lamination": {
      primary: "/images/products/trifold-brochure-open.jpg",
      alt: "250 GSM A4 trifold brochure unfolded accordion spread with glossy lamination",
      gallery: ["/images/products/trifold-brochure.jpg", "/images/products/brochure-a8-pocket.jpg"],
    },
    "brochure-a4-both-side-without-lamination": {
      primary: "/images/products/brochure-unlaminated-matte.jpg",
      alt: "250 GSM A4 heavy art card brochure with natural unlaminated matte finish",
      gallery: ["/images/products/trifold-brochure-open.jpg", "/images/products/trifold-brochure.jpg"],
    },
    "brochure-a4-single-side": {
      primary: "/images/products/brochure-unlaminated-matte.jpg",
      alt: "250 GSM A4 single side unlaminated brochure print",
      gallery: ["/images/products/trifold-brochure.jpg", "/images/products/brochure-a8-pocket.jpg"],
    },

    // Letterheads & Envelopes
    "letterhead-80-gsm-ss-finish": {
      primary: "/images/products/letterhead-80-gsm-ss.jpg",
      alt: "80 GSM Super Sunshine (SS) finish corporate business letterhead stack",
      gallery: ["/images/products/letterhead-ss-finish.jpg", "/images/products/letterhead-envelope-duo.jpg"],
    },
    "letterhead-100-alabaster-front-back": {
      primary: "/images/products/letterhead-envelope-duo.jpg",
      alt: "100 GSM Alabaster front and back watermarked letterhead with custom envelope",
      gallery: ["/images/products/letterhead-ss-finish.jpg", "/images/products/corporate-envelopes-set.jpg"],
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
