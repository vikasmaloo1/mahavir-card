import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { sql } from "drizzle-orm";

async function main() {
  console.log("Running banner table schema migration...");
  const { db } = await import("../src/lib/db/server");
  await db.execute(sql`ALTER TABLE banners ADD COLUMN IF NOT EXISTS "mobileImageUrl" text;`);
  await db.execute(sql`ALTER TABLE banners ADD COLUMN IF NOT EXISTS "mobileStorageKey" text;`);
  await db.execute(sql`ALTER TABLE banners ADD COLUMN IF NOT EXISTS "composition" text NOT NULL DEFAULT 'SPLIT_RIGHT';`);
  console.log("✓ Banner columns added successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
