import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { sql } from "drizzle-orm";

async function main() {
  console.log("Running search_logs table migration...");
  const { db } = await import("../src/lib/db/server");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "search_logs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "query" text NOT NULL,
      "normalizedQuery" text,
      "customerState" text,
      "customerType" text,
      "resultCount" integer NOT NULL DEFAULT 0,
      "confidence" text NOT NULL DEFAULT 'NONE',
      "matchedProductId" uuid REFERENCES "products"("id") ON DELETE SET NULL,
      "quoteFallbackInitiated" boolean NOT NULL DEFAULT false,
      "userId" uuid REFERENCES "user"("id") ON DELETE SET NULL,
      "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
      "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS "search_logs_query_idx" ON "search_logs" ("query");
    CREATE INDEX IF NOT EXISTS "search_logs_created_idx" ON "search_logs" ("createdAt");
  `);
  console.log("✓ search_logs table verified/created successfully!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
