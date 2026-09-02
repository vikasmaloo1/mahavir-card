import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { config as loadDotenv } from "dotenv";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { eq, sql } from "drizzle-orm";

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
  const fileBuffer = readFileSync(filePath);
  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        source: "mahavir-card-sync",
      },
    })
  );
  console.log(`  ✓ Uploaded to R2: ${key} (${(fileBuffer.length / 1024).toFixed(1)} KB)`);
  return key;
}

async function main() {
  console.log("=== Starting Cloudflare R2 & Database Image Sync ===");
  console.log(`Bucket: ${R2_BUCKET_NAME} | Endpoint: ${R2_ENDPOINT}`);

  // Dynamic import db to ensure dotenv is loaded first
  const { db } = await import("../src/lib/db/server");
  const { categories, products, productImages, categoryImages, banners, brandingAssets } = await import("../src/lib/db/schema");

  const imagesDir = join(process.cwd(), "public", "images");
  const localFiles = readdirSync(imagesDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"));

  console.log(`Found ${localFiles.length} local images in public/images/`);

  // 1. Upload all local images to Cloudflare R2 root media folder and banners folder
  for (const filename of localFiles) {
    const filePath = join(imagesDir, filename);
    const contentType = filename.endsWith(".png") ? "image/png" : "image/jpeg";
    await uploadToR2(`media/${filename}`, filePath, contentType);
    await uploadToR2(`banners/images/${filename}`, filePath, contentType);
  }

  // 2. Map of categories to primary and secondary images
  const categoryImageMap: Record<string, { primary: string; secondary: string; third: string }> = {
    "visiting-card": {
      primary: "/images/visiting-card-category.jpg",
      secondary: "/images/spot-uv-closeup.jpg",
      third: "/images/visiting-card-promo.jpg",
    },
    "premium-card": {
      primary: "/images/premium-card-category.jpg",
      secondary: "/images/spot-uv-closeup.jpg",
      third: "/images/visiting-card-promo.jpg",
    },
    "art-card": {
      primary: "/images/art-card-category.jpg",
      secondary: "/images/spot-uv-closeup.jpg",
      third: "/images/home-hero-printing.jpg",
    },
    "letterhead-envelope": {
      primary: "/images/letterhead-envelope-category.jpg",
      secondary: "/images/home-hero-printing.jpg",
      third: "/images/auth-studio-banner.jpg",
    },
    brochure: {
      primary: "/images/brochure-category.jpg",
      secondary: "/images/commercial-offset-banner.jpg",
      third: "/images/home-hero-printing.jpg",
    },
    "leaflet-cover": {
      primary: "/images/leaflet-category.jpg",
      secondary: "/images/commercial-offset-banner.jpg",
      third: "/images/home-hero-printing.jpg",
    },
    sticker: {
      primary: "/images/sticker-category.jpg",
      secondary: "/images/spot-uv-closeup.jpg",
      third: "/images/home-hero-printing.jpg",
    },
  };

  // 3. Update Categories in DB and insert categoryImages
  console.log("\n--- Syncing Categories in Database ---");
  const allCategories = await db.select().from(categories);
  for (const cat of allCategories) {
    const meta = categoryImageMap[cat.slug] || {
      primary: "/images/home-hero-printing.jpg",
      secondary: "/images/spot-uv-closeup.jpg",
      third: "/images/commercial-offset-banner.jpg",
    };

    // Touch category updatedAt
    await db
      .update(categories)
      .set({ updatedAt: new Date() })
      .where(eq(categories.id, cat.id));

    // Upload to category-specific R2 path
    const primaryFile = meta.primary.replace("/images/", "");
    const r2Key = `categories/${cat.id}/images/${primaryFile}`;
    await uploadToR2(r2Key, join(imagesDir, primaryFile));

    // Upsert into categoryImages table
    await db
      .insert(categoryImages)
      .values({
        id: crypto.randomUUID(),
        categoryId: cat.id,
        imageUrl: meta.primary,
        storageKey: r2Key,
        originalFilename: primaryFile,
        contentType: "image/jpeg",
        fileSize: statSync(join(imagesDir, primaryFile)).size,
        altText: `${cat.name} printing sample`,
        isPrimary: true,
        sortOrder: 0,
      })
      .onConflictDoNothing();

    console.log(`  ✓ Category updated: ${cat.name} -> ${meta.primary}`);
  }

  // 4. Update Products in DB and populate MULTIPLE product_images for slideshow
  console.log("\n--- Syncing Products & Slideshow Images in Database ---");
  const allProducts = await db.select().from(products);

  for (const prod of allProducts) {
    let catSlug = "visiting-card";
    if (prod.categoryId) {
      const [cat] = await db.select().from(categories).where(eq(categories.id, prod.categoryId));
      if (cat) catSlug = cat.slug;
    }

    const meta = categoryImageMap[catSlug] || categoryImageMap["visiting-card"];

    // Update product.imageUrl
    await db
      .update(products)
      .set({ imageUrl: meta.primary, updatedAt: new Date() })
      .where(eq(products.id, prod.id));

    // Clear old product images to rebuild fresh multi-image slideshow
    await db.delete(productImages).where(eq(productImages.productId, prod.id));

    // Image 1: Primary Finish View
    const file1 = meta.primary.replace("/images/", "");
    const key1 = `products/${prod.id}/images/1-${file1}`;
    await db.insert(productImages).values({
      id: crypto.randomUUID(),
      productId: prod.id,
      imageUrl: meta.primary,
      storageKey: key1,
      originalFilename: file1,
      contentType: "image/jpeg",
      fileSize: statSync(join(imagesDir, file1)).size,
      altText: `${prod.name} - Full sample view`,
      sortOrder: 0,
      isPrimary: true,
    });

    // Image 2: Texture & Spot UV / Detail View
    const file2 = meta.secondary.replace("/images/", "");
    const key2 = `products/${prod.id}/images/2-${file2}`;
    await db.insert(productImages).values({
      id: crypto.randomUUID(),
      productId: prod.id,
      imageUrl: meta.secondary,
      storageKey: key2,
      originalFilename: file2,
      contentType: "image/jpeg",
      fileSize: statSync(join(imagesDir, file2)).size,
      altText: `${prod.name} - Material finish close-up`,
      sortOrder: 1,
      isPrimary: false,
    });

    // Image 3: Production / Studio Angle
    const file3 = meta.third.replace("/images/", "");
    const key3 = `products/${prod.id}/images/3-${file3}`;
    await db.insert(productImages).values({
      id: crypto.randomUUID(),
      productId: prod.id,
      imageUrl: meta.third,
      storageKey: key3,
      originalFilename: file3,
      contentType: "image/jpeg",
      fileSize: statSync(join(imagesDir, file3)).size,
      altText: `${prod.name} - Print studio craftsmanship`,
      sortOrder: 2,
      isPrimary: false,
    });

    console.log(`  ✓ Product ${prod.name}: configured with 3 slideshow images`);
  }

  // 5. Update Banners for Slideshow
  console.log("\n--- Syncing Promotional Banners in Database ---");
  await db.delete(banners);

  const bannerData = [
    {
      title: "Tactile Luxury Visiting Cards",
      subtitle: "Velvet soft-touch, thermal matt, selective spot UV gloss, and metallic gold foil edge stamping on 400 GSM card stock.",
      badge: "Premium Finishes",
      ctaLabel: "Explore Visiting Cards",
      ctaUrl: "/products?category=visiting-card",
      imageUrl: "/images/visiting-card-promo.jpg",
      storageKey: "banners/images/visiting-card-promo.jpg",
      placement: "HOME_HERO_BOTTOM",
      animationType: "IMAGE_ZOOM",
      sortOrder: 0,
      isActive: true,
    },
    {
      title: "High-Volume Commercial Offset Printing",
      subtitle: "Multi-unit Heidelberg & Roland commercial presses in Khadia Golwad, Ahmedabad for high-speed runs from 500 to 50,000+.",
      badge: "Commercial Offset",
      ctaLabel: "Request Bulk Quote",
      ctaUrl: "/quote",
      imageUrl: "/images/commercial-offset-banner.jpg",
      storageKey: "banners/images/commercial-offset-banner.jpg",
      placement: "HOME_HERO_BOTTOM",
      animationType: "SLIDE_UP",
      sortOrder: 1,
      isActive: true,
    },
    {
      title: "250 GSM Art Card Brochures & Catalogues",
      subtitle: "Crisp machine creasing, vibrant CMYK saturation, and premium thermal laminations in A4 trifold and A8 pocket formats.",
      badge: "250 GSM Brochures",
      ctaLabel: "View Brochure Specs",
      ctaUrl: "/products?category=brochure",
      imageUrl: "/images/brochure-category.jpg",
      storageKey: "banners/images/brochure-category.jpg",
      placement: "HOME_HERO_BOTTOM",
      animationType: "FADE",
      sortOrder: 2,
      isActive: true,
    },
    {
      title: "Custom Square-Inch Product Stickers & Labels",
      subtitle: "Precision die-cut adhesive vinyl and Avery stickers calculated by exact square inches with safe margins.",
      badge: "Die-Cut Stickers",
      ctaLabel: "Configure Stickers",
      ctaUrl: "/products?category=sticker",
      imageUrl: "/images/sticker-category.jpg",
      storageKey: "banners/images/sticker-category.jpg",
      placement: "HOME_HERO_BOTTOM",
      animationType: "IMAGE_ZOOM",
      sortOrder: 3,
      isActive: true,
    },
    {
      title: "Executive Corporate Stationery & Envelopes",
      subtitle: "100 GSM Alabaster and SS finish papers for prestigious corporate correspondence and matching custom flap envelopes.",
      badge: "Corporate Stationery",
      ctaLabel: "Order Stationery",
      ctaUrl: "/products?category=letterhead-envelope",
      imageUrl: "/images/letterhead-envelope-category.jpg",
      storageKey: "banners/images/letterhead-envelope-category.jpg",
      placement: "HOME_HERO_BOTTOM",
      animationType: "FADE",
      sortOrder: 4,
      isActive: true,
    },
  ];

  // Insert for HOME_HERO_BOTTOM (5-slide banner slideshow!)
  for (const b of bannerData) {
    await db.insert(banners).values({
      id: crypto.randomUUID(),
      ...b,
    });
    console.log(`  ✓ Banner inserted: ${b.title} (${b.placement} slide #${b.sortOrder + 1})`);
  }

  // Seed for HOME_HERO, HOME_MID, CATALOG_TOP, and CART_CHECKOUT
  for (const b of bannerData) {
    await db.insert(banners).values({
      id: crypto.randomUUID(),
      ...b,
      placement: "HOME_HERO",
    });
    await db.insert(banners).values({
      id: crypto.randomUUID(),
      ...b,
      placement: "HOME_MID",
    });
    await db.insert(banners).values({
      id: crypto.randomUUID(),
      ...b,
      placement: "CATALOG_TOP",
    });
    await db.insert(banners).values({
      id: crypto.randomUUID(),
      ...b,
      placement: "CART_CHECKOUT",
    });
  }

  console.log("\n=== Cloudflare R2 & Database Sync Completed Successfully ===");
}

main().catch((error) => {
  console.error("FATAL Sync Error:", error);
  process.exit(1);
});
