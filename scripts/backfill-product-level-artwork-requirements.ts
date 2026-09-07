import dotenv from "dotenv";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";

import { artworkRequirements, artworkSlots, pricingRules, products } from "../src/lib/db/schema";

dotenv.config({ path: ".env.local" });
dotenv.config();

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("No database connection string configured");

const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const db = drizzle(pool);

/**
 * Fixes a real bug: 39 products' CDR artwork requirement is scoped only to
 * their B2C pricing rule (an artifact of B2B rules being seeded later), so
 * resolveArtworkRequirement() finds nothing for a B2B customer — the artwork
 * upload UI silently disappears on both the product page and the products-
 * listing inline order panel.
 *
 * Fix: for each such product, copy its single existing requirement (and
 * slots) into a PRODUCT-level default (scopeKey="PRODUCT", pricingRuleId
 * null) — the exact fallback resolveArtworkRequirement() already checks for
 * but that was never populated. This is additive only: the original B2C-
 * scoped row is untouched and still wins for B2C (exact match beats the
 * fallback), so B2C behavior is unchanged. The new row makes B2B (and any
 * future pricing rule) fall through to the same real spec instead of null.
 * Artwork upload/validation match on the *selected* pricingRuleId from the
 * order configuration, not the requirement's own scoping, so this doesn't
 * touch checkout validation at all — confirmed via src/lib/artwork-validation.ts.
 */
async function main() {
  const allProducts = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.isActive, true));
  const allRules = await db.select().from(pricingRules).where(eq(pricingRules.isActive, true));
  const allReqs = await db.select().from(artworkRequirements).where(eq(artworkRequirements.isActive, true));

  let fixedCount = 0;
  for (const product of allProducts) {
    const rules = allRules.filter((r) => r.productId === product.id);
    const hasB2B = rules.some((r) => r.customerType === "B2B");
    if (!hasB2B) continue;

    const reqs = allReqs.filter((r) => r.productId === product.id);
    if (!reqs.length) continue;
    const hasProductLevel = reqs.some((r) => r.scopeKey === "PRODUCT" || !r.pricingRuleId);
    if (hasProductLevel) continue;
    const b2bRuleIds = rules.filter((r) => r.customerType === "B2B").map((r) => r.id);
    const hasB2BSpecific = reqs.some((r) => b2bRuleIds.includes(r.pricingRuleId ?? ""));
    if (hasB2BSpecific) continue;
    if (reqs.length !== 1) {
      console.warn(`Skipping ${product.name}: ${reqs.length} existing requirement rows, ambiguous which to promote — needs manual review`);
      continue;
    }

    const source = reqs[0];
    const slots = await db.select().from(artworkSlots).where(eq(artworkSlots.artworkRequirementId, source.id));

    await db.transaction(async (tx) => {
      const [created] = await tx.insert(artworkRequirements).values({
        productId: source.productId,
        pricingRuleId: null,
        scopeKey: "PRODUCT",
        artworkRequired: source.artworkRequired,
        acceptedFormats: source.acceptedFormats,
        minFileSize: source.minFileSize,
        maxFileSize: source.maxFileSize,
        maxFiles: source.maxFiles,
        designWidth: source.designWidth,
        designHeight: source.designHeight,
        designUnit: source.designUnit,
        bleedWidth: source.bleedWidth,
        bleedHeight: source.bleedHeight,
        safeAreaWidth: source.safeAreaWidth,
        safeAreaHeight: source.safeAreaHeight,
        finalWidth: source.finalWidth,
        finalHeight: source.finalHeight,
        orientation: source.orientation,
        pageInstructions: source.pageInstructions,
        multiplePageInstructions: source.multiplePageInstructions,
        additionalInstructions: source.additionalInstructions,
        notes: source.notes,
        isActive: true,
      }).returning({ id: artworkRequirements.id });
      if (!created) throw new Error(`Failed to create product-level requirement for ${product.name}`);

      for (const slot of slots) {
        await tx.insert(artworkSlots).values({
          artworkRequirementId: created.id,
          pricingRuleId: null,
          slotKey: slot.slotKey,
          name: slot.name,
          required: slot.required,
          acceptedFormats: slot.acceptedFormats,
          maxFileSize: slot.maxFileSize,
          instructions: slot.instructions,
          sortOrder: slot.sortOrder,
          isActive: true,
        });
      }
    });

    fixedCount += 1;
    console.log(`Fixed: ${product.name} (${slots.length} slot${slots.length === 1 ? "" : "s"} copied)`);
  }

  console.log(`\nDone. Added a product-level artwork requirement fallback for ${fixedCount} products.`);
  await pool.end();
}

main().catch((error) => { console.error(error); process.exit(1); });
