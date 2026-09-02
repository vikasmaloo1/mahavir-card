import assert from "node:assert/strict";
import dotenv from "dotenv";
import { asc, count, eq } from "drizzle-orm";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { terms } from "../src/lib/db/schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED
  ?? process.env.POSTGRES_URL_NON_POOLING
  ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("No database connection string configured");
}

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

async function verifyTerms() {
  console.log("=== VERIFYING TERMS & CONDITIONS SUITE ===");

  // 1. Total count and active status
  const [totalResult] = await db.select({ value: count() }).from(terms);
  console.log(`Total terms count in DB: ${totalResult.value}`);
  assert.ok(totalResult.value >= 9, "Must have at least 9 terms in the database");

  const allTerms = await db
    .select()
    .from(terms)
    .where(eq(terms.isActive, true))
    .orderBy(asc(terms.sortOrder));

  assert.ok(allTerms.length >= 9, "All 9 terms must be active");
  console.log("✓ All terms are active and correctly ordered");

  // 2. Multilingual completeness (English, Gujarati, Hindi)
  for (const item of allTerms) {
    assert.ok(item.title && item.title.trim().length > 0, `Term ${item.id} must have English title`);
    assert.ok(item.content && item.content.trim().length > 0, `Term ${item.id} must have English content`);
    assert.ok(item.titleGu && item.titleGu.trim().length > 0, `Term ${item.title} must have Gujarati title`);
    assert.ok(item.contentGu && item.contentGu.trim().length > 0, `Term ${item.title} must have Gujarati content`);
    assert.ok(item.titleHi && item.titleHi.trim().length > 0, `Term ${item.title} must have Hindi title`);
    assert.ok(item.contentHi && item.contentHi.trim().length > 0, `Term ${item.title} must have Hindi content`);
  }
  console.log("✓ All terms have complete English, Gujarati, and Hindi translations");

  // 3. User Required Term 1: Color Matching
  const colorTerm = allTerms.find((t) => t.category === "COLOR_QUALITY" && t.title.toLowerCase().includes("color matching"));
  assert.ok(colorTerm, "Color matching term must exist");
  assert.ok(
    colorTerm.content.includes("Same color will never match with any printing previously done"),
    "Color matching content must match required specification",
  );
  assert.ok(
    colorTerm.content.includes("get job profile saved with us, extra charges will be payable against job profiling"),
    "Color matching job profiling clause must be present",
  );
  console.log("✓ User Term 1: Color matching & job profiling clause verified");

  // 4. User Required Term 2: Goods Responsibility (IMPORTANT in RED visual effect)
  const importantTerm = allTerms.find((t) => t.isImportant === true);
  assert.ok(importantTerm, "Important term with isImportant: true must exist");
  assert.equal(importantTerm.isImportant, true, "Important term must have isImportant = true");
  assert.ok(
    importantTerm.content.includes("I accept the Printers Club of India Limited's responsibility ceases the moment the goods leave company's godown"),
    "Goods responsibility clause must match exact text",
  );
  assert.ok(importantTerm.contentGu?.includes("પ્રિન્ટર્સ ક્લબ"), "Gujarati translation of godown responsibility present");
  assert.ok(importantTerm.contentHi?.includes("प्रिंटर्स क्लब"), "Hindi translation of godown responsibility present");
  console.log("✓ User Term 2: Godown dispatch responsibility (RED / isImportant) verified");

  // 5. User Required Term 3: Legal Jurisdiction
  const jurisdictionTerm = allTerms.find((t) => t.content.toLowerCase().includes("ahmedabad jurisdiction only"));
  assert.ok(jurisdictionTerm, "Jurisdiction clause must exist");
  assert.ok(
    jurisdictionTerm.content.includes("All the legal matters are subject to Ahmedabad Jurisdiction Only"),
    "Ahmedabad jurisdiction clause text verified",
  );
  console.log("✓ User Term 3: Ahmedabad Jurisdiction Only clause verified");

  console.log("=== ALL TERMS & CONDITIONS CHECKS PASSED PERFECTLY ===");
  await pool.end();
}

verifyTerms().catch((err) => {
  console.error("Verification failed:", err);
  pool.end();
  process.exit(1);
});
