import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { sql } from "drizzle-orm";

const brainDir = "C:\\Users\\Vikas\\.gemini\\antigravity\\brain\\043843d2-2090-44d1-994c-2bfd8a23e4c9";
const publicTargetDir = path.resolve(process.cwd(), "public/images/products");

const imageMappings: Array<{
  pattern: RegExp;
  targetFileName: string;
  productSlugs: string[];
  productNames?: string[];
  categorySlug?: string;
}> = [
  {
    pattern: /^corp_gift_box_ad_.*\.jpg$/,
    targetFileName: "corporate-gift-boxes-ad.jpg",
    productSlugs: ["corporate-gift-boxes"],
    categorySlug: "corporate-gifting",
  },
  {
    pattern: /^rigid_box_ad_.*\.jpg$/,
    targetFileName: "packaging-boxes-ad.jpg",
    productSlugs: ["packaging-boxes"],
    categorySlug: "packaging",
  },
  {
    pattern: /^paper_bags_ad_.*\.jpg$/,
    targetFileName: "paper-bags-ad.jpg",
    productSlugs: ["paper-bags"],
  },
  {
    pattern: /^standees_ad_.*\.jpg$/,
    targetFileName: "standees-ad.jpg",
    productSlugs: ["standees"],
  },
  {
    pattern: /^velvet_gold_foil_ad_.*\.jpg$/,
    targetFileName: "velvet-foil-card-ad.jpg",
    productSlugs: [
      "premium-400-gsm-velvet-front-back-foil",
      "premium-400-gsm-velvet-single-side-foil",
      "premium-400-gsm-velvet",
    ],
  },
  {
    pattern: /^dripoff_hybrid_card_ad_.*\.jpg$/,
    targetFileName: "dripoff-hybrid-card-ad.jpg",
    productSlugs: ["premium-400-gsm-dripoff-front-back"],
  },
  {
    pattern: /^luxury_brochure_ad_.*\.jpg$/,
    targetFileName: "luxury-brochures-ad.jpg",
    productSlugs: ["brochures"],
    categorySlug: "brochure",
  },
  {
    pattern: /^executive_diaries_ad_.*\.jpg$/,
    targetFileName: "executive-diaries-ad.jpg",
    productSlugs: ["diaries", "notebooks", "registers"],
    categorySlug: "stationery",
  },
  {
    pattern: /^presentation_folder_ad_.*\.jpg$/,
    targetFileName: "presentation-folder-ad.jpg",
    productSlugs: ["folders"],
  },
  {
    pattern: /^luxury_labels_ad_.*\.jpg$/,
    targetFileName: "luxury-labels-ad.jpg",
    productSlugs: ["product-labels", "bottle-labels", "barcode-labels", "sticker-print"],
    categorySlug: "labels-stickers",
  },
  {
    pattern: /^luxury_flyers_ad_.*\.jpg$/,
    targetFileName: "luxury-flyers-ad.jpg",
    productSlugs: ["flyers", "pamphlets"],
  },
  {
    pattern: /^medical_file_folder_ad_.*\.jpg$/,
    targetFileName: "medical-file-folder-ad.jpg",
    productSlugs: ["doctor-file-job"],
  },
  {
    pattern: /^vinyl_signage_ad_.*\.jpg$/,
    targetFileName: "vinyl-signage-ad.jpg",
    productSlugs: ["vinyl-graphics"],
    categorySlug: "branding-signage",
  },
];

async function main() {
  console.log("Syncing generated ad images to public directory and DB...");
  const files = fs.readdirSync(brainDir);

  const { db } = await import("../src/lib/db/server");

  for (const mapping of imageMappings) {
    const matched = files.filter((f) => mapping.pattern.test(f)).sort().reverse()[0];
    if (!matched) {
      console.warn(`No match found in brain for pattern ${mapping.pattern}`);
      continue;
    }

    const srcPath = path.join(brainDir, matched);
    const destPath = path.join(publicTargetDir, mapping.targetFileName);
    fs.copyFileSync(srcPath, destPath);
    console.log(`✓ Copied ${matched} -> public/images/products/${mapping.targetFileName}`);

    const publicUrl = `/images/products/${mapping.targetFileName}`;

    // Update matching products in DB
    for (const slug of mapping.productSlugs) {
      const res = await db.execute(sql`
        UPDATE products
        SET "imageUrl" = ${publicUrl}, "updatedAt" = now()
        WHERE slug = ${slug}
        RETURNING id, name, slug;
      `);
      if (res.rows.length > 0) {
        console.log(`  ✓ Updated product [${res.rows[0].name}] with ${publicUrl}`);
      }
    }

    // Update category image if applicable
    if (mapping.categorySlug) {
      const catRes = await db.execute(sql`
        SELECT id, name FROM categories WHERE slug = ${mapping.categorySlug} LIMIT 1;
      `);
      if (catRes.rows.length > 0) {
        const catId = catRes.rows[0].id;
        // Upsert category_images
        await db.execute(sql`
          INSERT INTO category_images ("categoryId", "imageUrl", "storageKey", "originalFilename", "contentType", "fileSize", "isPrimary")
          VALUES (${catId}, ${publicUrl}, ${"cat-" + mapping.categorySlug + "-ad"}, ${mapping.targetFileName}, 'image/jpeg', 500000, true)
          ON CONFLICT ("storageKey") DO UPDATE
          SET "imageUrl" = EXCLUDED."imageUrl",
              "isPrimary" = true;
        `);
        console.log(`  ✓ Updated category [${catRes.rows[0].name}] primary image with ${publicUrl}`);
      }
    }
  }

  console.log("\nAll images synced and assigned successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync error:", err);
  process.exit(1);
});
