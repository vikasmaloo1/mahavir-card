import dotenv from "dotenv";
import { createHash } from "node:crypto";

dotenv.config({ path: ".env.local" });
dotenv.config();

function uuidFor(value: string) {
  const hex = createHash("sha256").update(value).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function money(value: number | undefined) {
  return value === undefined ? undefined : value.toFixed(2);
}

async function main() {
  const { db, pool } = await import("../src/lib/db");
  const { eq } = await import("drizzle-orm");
  const { pricingRules } = await import("../src/lib/db/schema");
  const { rateCatalog } = await import("../src/lib/rate-catalog");
  const { b2bRateOverrides } = await import("../src/lib/b2b-rate-catalog");

  let updated = 0;
  let inserted = 0;
  const unmatched: string[] = [];

  for (const category of rateCatalog) {
    for (const [itemIndex, item] of category.items.entries()) {
      const override = b2bRateOverrides[item.slug];
      if (!override) {
        unmatched.push(item.slug);
        continue;
      }

      const productId = uuidFor(`rate-product:${item.slug}`);
      const b2cRuleId = uuidFor(`rate-pricing:${item.slug}`);
      const b2bRuleId = uuidFor(`rate-pricing-b2b:${item.slug}`);

      // Mark the existing rate-catalog rule as B2C-only (it was previously served to everyone).
      await db.update(pricingRules).set({ customerType: "B2C", updatedAt: new Date() }).where(eq(pricingRules.id, b2cRuleId));

      const priceFormula = item.ruleType === "PER_SQ_INCH"
        ? {
            ratePerSqInch: item.rateUnit === "PAISE" ? (override.ratePerSqInch ?? 0) : override.ratePerSqInch,
            ratePaisePerSqInch: item.rateUnit === "PAISE" ? override.ratePerSqInch : null,
            rateUnit: item.rateUnit ?? "RUPEES",
            unit: "reference_batch_area",
            minimumArea: item.minimumArea ?? null,
            minimumCharge: item.minimumCharge ?? null,
            bladeCharge: item.bladeCharge ?? null,
            source: "PRICE LIST.xlsx (B2B)",
            sheet: 1,
          }
        : {
            amount: money(override.amount),
            unit: "batch",
            source: "PRICE LIST.xlsx (B2B)",
            sheet: 1,
          };

      await db.insert(pricingRules).values({
        id: b2bRuleId,
        productId,
        name: item.name,
        ruleType: item.ruleType,
        conditions: { quantity: item.referenceQuantity ?? 1, specification: item.name, size: item.size ?? null },
        priceFormula,
        taxRate: "0.000",
        taxInclusive: true,
        customerType: "B2B",
        productionTime: item.productionTime ?? null,
        sortOrder: itemIndex,
        isActive: true,
      }).onConflictDoUpdate({
        target: pricingRules.id,
        set: {
          productId,
          name: item.name,
          ruleType: item.ruleType,
          conditions: { quantity: item.referenceQuantity ?? 1, specification: item.name, size: item.size ?? null },
          priceFormula,
          taxRate: "0.000",
          taxInclusive: true,
          customerType: "B2B",
          productionTime: item.productionTime ?? null,
          sortOrder: itemIndex,
          isActive: true,
          updatedAt: new Date(),
        },
      });

      updated += 1;
      inserted += 1;
      console.log(`  B2B priced: ${item.name} (${item.slug}) — ${item.ruleType === "PER_SQ_INCH" ? `₹${override.ratePerSqInch}/sq.in` : `₹${override.amount}`}`);
    }
  }

  console.log(`\nUpdated ${updated} existing rules to customerType=B2C and inserted/updated ${inserted} B2B pricing rules.`);
  if (unmatched.length) console.log(`No B2B override found for: ${unmatched.join(", ")}`);

  await pool.end();
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
