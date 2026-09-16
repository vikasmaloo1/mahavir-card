import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import { sql } from "drizzle-orm";

async function main() {
  console.log("Running HSN & Bills table schema migration...");
  const { db } = await import("../src/lib/db/server");

  // 1. Categories table: add hsnCode
  await db.execute(sql`
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS "hsnCode" text NOT NULL DEFAULT '4909';
  `);
  console.log("✓ categories.hsnCode ensured");

  // 2. Orders table: add chalanNumber, chalanSequence, chalanDate
  await db.execute(sql`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS "chalanNumber" text;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS "chalanSequence" integer;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS "chalanDate" timestamp with time zone;
  `);
  console.log("✓ orders chalan columns ensured");

  // 3. Bills table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bills (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "invoiceNumber" text NOT NULL UNIQUE,
      "invoiceYear" text NOT NULL,
      "invoiceSequence" integer NOT NULL,
      "invoiceDate" timestamp with time zone NOT NULL DEFAULT now(),
      "chalanNumber" text,
      "chalanSequence" integer,
      "chalanDate" timestamp with time zone,
      "customerId" uuid REFERENCES customers(id) ON DELETE SET NULL,
      "customerName" text NOT NULL,
      "companyName" text,
      "phone" text,
      "addressLine1" text,
      "addressLine2" text,
      "city" text DEFAULT 'Ahmedabad',
      "state" text DEFAULT 'Gujarat',
      "stateCode" text DEFAULT 'GJ',
      "postalCode" text,
      "gstin" text,
      "items" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "taxType" text NOT NULL DEFAULT 'INTRA_STATE',
      "cgstRate" numeric(6, 3) NOT NULL DEFAULT 9.000,
      "cgstAmount" numeric(12, 2) NOT NULL DEFAULT 0.00,
      "sgstRate" numeric(6, 3) NOT NULL DEFAULT 9.000,
      "sgstAmount" numeric(12, 2) NOT NULL DEFAULT 0.00,
      "igstRate" numeric(6, 3) NOT NULL DEFAULT 0.000,
      "igstAmount" numeric(12, 2) NOT NULL DEFAULT 0.00,
      "subtotal" numeric(12, 2) NOT NULL DEFAULT 0.00,
      "deliveryCharge" numeric(12, 2) NOT NULL DEFAULT 0.00,
      "roundOff" numeric(12, 2) NOT NULL DEFAULT 0.00,
      "grandTotal" numeric(12, 2) NOT NULL DEFAULT 0.00,
      "amountInWords" text,
      "terms" text DEFAULT 'Immediate',
      "notes" text,
      "status" text NOT NULL DEFAULT 'PAID',
      "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
      "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "bills_invoice_number_idx" ON bills ("invoiceNumber");
    CREATE INDEX IF NOT EXISTS "bills_invoice_year_seq_idx" ON bills ("invoiceYear", "invoiceSequence");
    CREATE INDEX IF NOT EXISTS "bills_chalan_number_idx" ON bills ("chalanNumber");
  `);
  console.log("✓ bills table & indexes ensured");

  // 4. Bill Item Types table
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS bill_item_types (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" text NOT NULL UNIQUE,
      "hsnCode" text NOT NULL DEFAULT '4909',
      "defaultRate" numeric(12, 2) DEFAULT 0.00,
      "defaultPer" text NOT NULL DEFAULT 'PCS.',
      "sortOrder" integer NOT NULL DEFAULT 0,
      "isActive" boolean NOT NULL DEFAULT true,
      "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
      "updatedAt" timestamp with time zone NOT NULL DEFAULT now()
    );
  `);
  console.log("✓ bill_item_types table ensured");

  // 5. Update categories HSN codes based on user specifications:
  // - card & premuim card: 4909
  // - Paper & cover & art card Broucehr: 4802
  // - sticker: 4821
  await db.execute(sql`
    UPDATE categories
    SET "hsnCode" = '4909'
    WHERE slug IN ('visiting-card', 'visiting-cards', 'premium-card', 'premium-cards')
       OR name ILIKE '%card%';

    UPDATE categories
    SET "hsnCode" = '4821'
    WHERE slug IN ('sticker', 'stickers', 'labels')
       OR name ILIKE '%sticker%';

    UPDATE categories
    SET "hsnCode" = '4802'
    WHERE slug IN ('art-card', 'art-cards', 'brochure', 'brochures', 'letterhead-envelope', 'leaflet-cover', 'paper', 'cover')
       OR name ILIKE '%brochure%'
       OR name ILIKE '%paper%'
       OR name ILIKE '%cover%'
       OR name ILIKE '%letterhead%'
       OR name ILIKE '%envelope%'
       OR name ILIKE '%art card%';
  `);
  console.log("✓ categories HSN codes updated");

  // 6. Seed preset bill item types
  const defaultTypes = [
    { name: "Card & Premium Card", hsn: "4909", per: "PCS.", sort: 1 },
    { name: "Paper & Cover & Art Card Brochure", hsn: "4802", per: "PCS.", sort: 2 },
    { name: "Sticker", hsn: "4821", per: "PCS.", sort: 3 },
    { name: "Visiting Cards (Single Side)", hsn: "4909", per: "PCS.", sort: 4 },
    { name: "Visiting Cards (Both Side)", hsn: "4909", per: "PCS.", sort: 5 },
    { name: "Letterhead", hsn: "4802", per: "PCS.", sort: 6 },
    { name: "Envelope", hsn: "4802", per: "PCS.", sort: 7 },
    { name: "Flyer / Pamphlet", hsn: "4802", per: "PCS.", sort: 8 },
  ];

  for (const t of defaultTypes) {
    await db.execute(sql`
      INSERT INTO bill_item_types ("name", "hsnCode", "defaultPer", "sortOrder", "isActive")
      VALUES (${t.name}, ${t.hsn}, ${t.per}, ${t.sort}, true)
      ON CONFLICT ("name") DO UPDATE
      SET "hsnCode" = EXCLUDED."hsnCode",
          "defaultPer" = EXCLUDED."defaultPer";
    `);
  }
  console.log("✓ default bill item types seeded");

  // Print current categories with their HSN codes
  const cats = await db.execute(sql`SELECT id, name, slug, "hsnCode" FROM categories ORDER BY "sortOrder" ASC, name ASC;`);
  console.log("\nCurrent Categories with HSN Codes:");
  console.table(cats.rows);

  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
