import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { sql } from "drizzle-orm";

async function main() {
  const { db } = await import("../src/lib/db/server");

  const cats = await db.execute(sql`
    SELECT c.id, c.name, c.slug, ci."imageUrl"
    FROM categories c
    LEFT JOIN category_images ci ON c.id = ci."categoryId" AND ci."isPrimary" = true
    ORDER BY c.name ASC;
  `);
  console.log("=== CATEGORIES ===");
  for (const c of cats.rows as any[]) {
    console.log(`CAT: [${c.name}] slug: [${c.slug}] img: [${c.imageUrl || "MISSING"}]`);
  }

  const prods = await db.execute(sql`
    SELECT p.id, p.name, p.slug, p."imageUrl", c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p."categoryId" = c.id
    ORDER BY p.name ASC;
  `);

  console.log("\n=== MISSING PRODUCT IMAGES ===");
  let missing = 0;
  for (const p of prods.rows as any[]) {
    if (!p.imageUrl) {
      missing++;
      console.log(`PROD: [${p.name}] slug: [${p.slug}] cat: [${p.category_name}]`);
    }
  }
  console.log(`Total products: ${prods.rows.length}, Missing: ${missing}`);

  console.log("\n=== ALL PRODUCTS ===");
  for (const cp of prods.rows as any[]) {
    console.log(`PROD: [${cp.name}] slug: [${cp.slug}] cat: [${cp.category_name}] img: [${cp.imageUrl ? cp.imageUrl.slice(0, 30) : "MISSING"}]`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
