import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

async function testPricing() {
  const { calculateProductPrice } = await import("../src/lib/pricing-service");
  const { db } = await import("../src/lib/db");
  const { products, customers } = await import("../src/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const [product] = await db.select().from(products).where(eq(products.slug, "400-gsm-thermal-matt-single-front-back"));
  const [b2bCustomer] = await db.select().from(customers).where(eq(customers.customerType, "B2B")).limit(1);
  const [b2cCustomer] = await db.select().from(customers).where(eq(customers.customerType, "B2C")).limit(1);

  const cornerCutId = "53f6fb33-57c4-4f7e-8e0e-ad1a7efa5a49";

  console.log("Testing B2C calculation with Corner Cut...");
  const b2cPrice = await calculateProductPrice(product.id, 1000, { specification: product.name }, {
    addonIds: [cornerCutId],
    userId: b2cCustomer?.userId ?? undefined,
  });
  console.log("B2C result:", {
    productPrice: b2cPrice?.productPrice,
    addonTotal: b2cPrice?.addonTotal,
    addons: b2cPrice?.addons,
    grandTotal: b2cPrice?.grandTotal,
  });

  console.log("\nTesting B2B calculation with Corner Cut...");
  const b2bPrice = await calculateProductPrice(product.id, 1000, { specification: product.name }, {
    addonIds: [cornerCutId],
    userId: b2bCustomer?.userId ?? undefined,
  });
  console.log("B2B result:", {
    productPrice: b2bPrice?.productPrice,
    addonTotal: b2bPrice?.addonTotal,
    addons: b2bPrice?.addons,
    grandTotal: b2bPrice?.grandTotal,
  });

  console.log("\nTesting B2B calculation at 2000 quantity with Corner Cut (should multiply ref qty)...");
  const b2bPrice2000 = await calculateProductPrice(product.id, 2000, { specification: product.name }, {
    addonIds: [cornerCutId],
    userId: b2bCustomer?.userId ?? undefined,
  });
  console.log("B2B 2000 pcs result:", {
    productPrice: b2bPrice2000?.productPrice,
    addonTotal: b2bPrice2000?.addonTotal,
    addons: b2bPrice2000?.addons,
    grandTotal: b2bPrice2000?.grandTotal,
  });
}

testPricing().catch(console.error).then(() => process.exit(0));
