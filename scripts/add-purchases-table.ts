import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function main() {
  const { db } = await import("../src/lib/db");
  const { sql } = await import("drizzle-orm");
  
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS purchases (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "partyName" TEXT NOT NULL,
      "partyGstin" TEXT,
      "billNo" TEXT NOT NULL,
      "hsnCode" TEXT NOT NULL DEFAULT '4802',
      description TEXT,
      qty NUMERIC(12,3),
      "qtyUnit" TEXT DEFAULT 'PCS',
      "taxValue" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "taxType" TEXT NOT NULL DEFAULT 'INTRA_STATE',
      "cgstRate" NUMERIC(6,3) NOT NULL DEFAULT 9,
      "cgstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "sgstRate" NUMERIC(6,3) NOT NULL DEFAULT 9,
      "sgstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "igstRate" NUMERIC(6,3) NOT NULL DEFAULT 0,
      "igstAmount" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "roundOff" NUMERIC(12,2) NOT NULL DEFAULT 0,
      "totalValue" NUMERIC(12,2) NOT NULL DEFAULT 0,
      notes TEXT,
      "createdBy" UUID REFERENCES "user"(id) ON DELETE SET NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `));

  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS purchases_date_idx ON purchases(date)`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS purchases_party_gstin_idx ON purchases("partyGstin")`));
  
  console.log("purchases table created/verified successfully");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });