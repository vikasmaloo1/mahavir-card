import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import assert from "node:assert/strict";
import { calculateTax } from "../src/lib/tax-service";
import { isCustomerProfileComplete } from "../src/lib/customer-profile";

async function runSuite() {
  const { calculateProductPrice } = await import("../src/lib/pricing-service");
  const { db } = await import("../src/lib/db/server");
  const { products, productDeliveryRules, categories } = await import("../src/lib/db/schema");
  const { eq, and } = await import("drizzle-orm");
  console.log("=== STARTING COMPLETE TAX, PRICING, DELIVERY & STATE VERIFICATION SUITE ===");

  // -------------------------------------------------------------
  // PART 1: PURE TAX ENGINE TEST CASES (Requirements 1 & 4)
  // -------------------------------------------------------------
  console.log("\n--- Part 1: Automated GST Test Cases ---");

  // Test 1: Gujarat customer, Base ₹240 -> CGST 21.60, SGST 21.60, IGST 0, Total 283.20
  const t1 = calculateTax({ taxableSubtotal: 240, stateCode: "GJ", taxRate: 18 });
  console.log("Test 1 (GJ ₹240):", t1);
  assert.equal(t1.taxableSubtotal, "240.00");
  assert.equal(t1.cgstAmount, "21.60");
  assert.equal(t1.sgstAmount, "21.60");
  assert.equal(t1.igstAmount, "0.00");
  assert.equal(t1.taxAmount, "43.20");
  assert.equal(t1.grandTotal, "283.20");
  assert.equal(t1.taxType, "INTRA_STATE");
  assert.equal(t1.customerState, "GJ");
  console.log("✓ Test 1 PASSED: Gujarat ₹240 -> CGST ₹21.60 + SGST ₹21.60 = ₹283.20");

  // Test 2: Rajasthan customer, Base ₹240 -> CGST 0, SGST 0, IGST 43.20, Total 283.20
  const t2 = calculateTax({ taxableSubtotal: 240, stateCode: "RJ", taxRate: 18 });
  console.log("Test 2 (RJ ₹240):", t2);
  assert.equal(t2.taxableSubtotal, "240.00");
  assert.equal(t2.cgstAmount, "0.00");
  assert.equal(t2.sgstAmount, "0.00");
  assert.equal(t2.igstAmount, "43.20");
  assert.equal(t2.taxAmount, "43.20");
  assert.equal(t2.grandTotal, "283.20");
  assert.equal(t2.taxType, "INTER_STATE");
  assert.equal(t2.customerState, "RJ");
  console.log("✓ Test 2 PASSED: Rajasthan ₹240 -> IGST ₹43.20 (CGST/SGST ₹0) = ₹283.20");

  // Test 3: Base ₹0 -> all tax = 0
  const t3 = calculateTax({ taxableSubtotal: 0, stateCode: "GJ", taxRate: 18 });
  console.log("Test 3 (₹0 Base):", t3);
  assert.equal(t3.taxableSubtotal, "0.00");
  assert.equal(t3.cgstAmount, "0.00");
  assert.equal(t3.sgstAmount, "0.00");
  assert.equal(t3.igstAmount, "0.00");
  assert.equal(t3.taxAmount, "0.00");
  assert.equal(t3.grandTotal, "0.00");
  console.log("✓ Test 3 PASSED: Base ₹0 -> all tax = 0.00");

  // Test 4: Base ₹500, Gujarat -> 9% + 9%
  const t4 = calculateTax({ taxableSubtotal: 500, stateCode: "GJ", taxRate: 18 });
  console.log("Test 4 (GJ ₹500):", t4);
  assert.equal(t4.taxableSubtotal, "500.00");
  assert.equal(t4.cgstAmount, "45.00");
  assert.equal(t4.sgstAmount, "45.00");
  assert.equal(t4.igstAmount, "0.00");
  assert.equal(t4.taxAmount, "90.00");
  assert.equal(t4.grandTotal, "590.00");
  console.log("✓ Test 4 PASSED: Gujarat ₹500 -> CGST ₹45.00 + SGST ₹45.00 = ₹590.00");

  // Test 5: Base ₹500, Rajasthan -> 18% IGST
  const t5 = calculateTax({ taxableSubtotal: 500, stateCode: "RJ", taxRate: 18 });
  console.log("Test 5 (RJ ₹500):", t5);
  assert.equal(t5.taxableSubtotal, "500.00");
  assert.equal(t5.cgstAmount, "0.00");
  assert.equal(t5.sgstAmount, "0.00");
  assert.equal(t5.igstAmount, "90.00");
  assert.equal(t5.taxAmount, "90.00");
  assert.equal(t5.grandTotal, "590.00");
  console.log("✓ Test 5 PASSED: Rajasthan ₹500 -> IGST ₹90.00 = ₹590.00");

  // -------------------------------------------------------------
  // PART 2: DATABASE PRODUCT & DELIVERY VERIFICATION (Requirements 8, 9, 10, 11)
  // -------------------------------------------------------------
  console.log("\n--- Part 2: Database Catalog, Delivery & Sticker Verification ---");

  // Verify 7 active categories
  const activeCategories = await db.select().from(categories).where(eq(categories.isActive, true));
  console.log(`Active categories in DB: ${activeCategories.length}`);
  const catSlugs = activeCategories.map((c) => c.slug);
  assert.ok(catSlugs.includes("visiting-card"), "Visiting Card category must be active");
  assert.ok(catSlugs.includes("premium-card"), "Premium Card category must be active");
  assert.ok(catSlugs.includes("art-card"), "Art Card category must be active");
  assert.ok(catSlugs.includes("letterhead-envelope"), "Letterhead/Envelope category must be active");
  assert.ok(catSlugs.includes("brochure"), "Brochure category must be active");
  assert.ok(catSlugs.includes("leaflet-cover"), "Leaflet/Cover category must be active");
  assert.ok(catSlugs.includes("sticker"), "Sticker category must be active");
  console.log("✓ 7 Active Categories verified:", catSlugs.join(", "));

  // Verify Visiting Card NT Single Product & Delivery Rules
  const [ntSingle] = await db.select().from(products).where(eq(products.slug, "nt-single")).limit(1);
  assert.ok(ntSingle, "NT Single product must exist in database");

  const ntDeliveryRules = await db.select().from(productDeliveryRules).where(and(eq(productDeliveryRules.productId, ntSingle.id), eq(productDeliveryRules.isActive, true)));
  console.log("NT Single delivery rules:", ntDeliveryRules.map((r) => `${r.deliveryMethod} [${r.stateCode}]: ₹${r.price}`));
  const gjRule = ntDeliveryRules.find((r) => r.deliveryMethod === "COURIER" && r.stateCode === "GJ");
  const rjRule = ntDeliveryRules.find((r) => r.deliveryMethod === "COURIER" && r.stateCode === "RJ");
  assert.ok(gjRule && Number(gjRule.price) === 60, "Visiting Card GJ Courier must be ₹60");
  assert.ok(rjRule && Number(rjRule.price) === 80, "Visiting Card RJ Courier must be ₹80");
  console.log("✓ Visiting Card Delivery Rules verified (GJ: ₹60, RJ: ₹80)");

  // Verify Premium Card Delivery Rules
  const [premium400] = await db.select().from(products).where(eq(products.slug, "premium-400-gsm-velvet")).limit(1);
  assert.ok(premium400, "Premium 400 GSM product must exist");
  const premDeliveryRules = await db.select().from(productDeliveryRules).where(and(eq(productDeliveryRules.productId, premium400.id), eq(productDeliveryRules.isActive, true)));
  const premGj = premDeliveryRules.find((r) => r.deliveryMethod === "COURIER" && r.stateCode === "GJ");
  const premRj = premDeliveryRules.find((r) => r.deliveryMethod === "COURIER" && r.stateCode === "RJ");
  assert.ok(premGj && Number(premGj.price) === 80, "Premium Card GJ Courier must be ₹80");
  assert.ok(premRj && Number(premRj.price) === 100, "Premium Card RJ Courier must be ₹100");
  console.log("✓ Premium Card Delivery Rules verified (GJ: ₹80, RJ: ₹100)");

  // Verify Sticker has NO courier rules
  const [stickerProduct] = await db.select().from(products).where(eq(products.slug, "sticker-without-lamination")).limit(1);
  assert.ok(stickerProduct, "Sticker product must exist");
  const stickerDelivery = await db.select().from(productDeliveryRules).where(and(eq(productDeliveryRules.productId, stickerProduct.id), eq(productDeliveryRules.isActive, true)));
  assert.equal(stickerDelivery.filter((d) => d.deliveryMethod === "COURIER").length, 0, "Stickers must have NO courier delivery rules");
  console.log("✓ Sticker verified: NO COURIER rules configured");

  // -------------------------------------------------------------
  // PART 3: REAL BUSINESS SCENARIO PRICING CALCULATIONS (Requirement 39)
  // -------------------------------------------------------------
  console.log("\n--- Part 3: Real Business Scenarios via calculateProductPrice ---");

  // Scenario A: Customer Gujarat, Business Card NT Single 1000, Courier (₹60)
  // Base ₹240 + Courier ₹60 = ₹300 taxable -> CGST 9% (₹27.00) + SGST 9% (₹27.00) -> Total ₹354.00
  const scenA = await calculateProductPrice(ntSingle.id, 1000, {}, {
    stateCode: "GJ",
    delivery: { method: "COURIER", stateCode: "GJ" },
  });
  console.log("Scenario A result:", scenA);
  assert.ok(scenA, "Scenario A calculation must succeed");
  assert.equal(scenA.productPrice, "240.00");
  assert.equal(scenA.delivery.price, "60.00");
  assert.equal(scenA.priceBeforeTax, "300.00");
  assert.equal(scenA.cgstAmount, "27.00");
  assert.equal(scenA.sgstAmount, "27.00");
  assert.equal(scenA.igstAmount, "0.00");
  assert.equal(scenA.grandTotal, "354.00");
  console.log("✓ Scenario A PASSED: NT Single + GJ Courier -> Base ₹240 + Courier ₹60 + CGST ₹27 + SGST ₹27 = ₹354.00");

  // Scenario B: Customer Rajasthan, Business Card NT Single 1000, Courier (₹80)
  // Base ₹240 + Courier ₹80 = ₹320 taxable -> IGST 18% (₹57.60) -> Total ₹377.60
  const scenB = await calculateProductPrice(ntSingle.id, 1000, {}, {
    stateCode: "RJ",
    delivery: { method: "COURIER", stateCode: "RJ" },
  });
  console.log("Scenario B result:", scenB);
  assert.ok(scenB, "Scenario B calculation must succeed");
  assert.equal(scenB.productPrice, "240.00");
  assert.equal(scenB.delivery.price, "80.00");
  assert.equal(scenB.priceBeforeTax, "320.00");
  assert.equal(scenB.cgstAmount, "0.00");
  assert.equal(scenB.sgstAmount, "0.00");
  assert.equal(scenB.igstAmount, "57.60");
  assert.equal(scenB.grandTotal, "377.60");
  console.log("✓ Scenario B PASSED: NT Single + RJ Courier -> Base ₹240 + Courier ₹80 + IGST ₹57.60 = ₹377.60");

  // Scenario C: Sticker square-inch calculation
  // 1000 cards, 10 sq.in each, min charge ₹250
  const scenC = await calculateProductPrice(stickerProduct.id, 1000, { width: 3, height: 3, bladeCount: 0 }, {
    stateCode: "GJ",
  });
  console.log("Scenario C (Sticker) result:", scenC);
  assert.ok(scenC, "Scenario C calculation must succeed");
  // Area = 9 sq.in * 0.33 = 2.97, minCharge is 250 -> 250 taxable -> CGST 22.50 + SGST 22.50 = 295.00
  assert.equal(scenC.productPrice, "250.00");
  assert.equal(scenC.cgstAmount, "22.50");
  assert.equal(scenC.sgstAmount, "22.50");
  assert.equal(scenC.grandTotal, "295.00");
  console.log("✓ Scenario C PASSED: Sticker square-inch min-charge ₹250 + GST = ₹295.00");

  // -------------------------------------------------------------
  // PART 4: PROFILE COMPLETION LOGIC (Requirement 22)
  // -------------------------------------------------------------
  console.log("\n--- Part 4: Profile Completion Logic ---");
  const completeProfile = isCustomerProfileComplete({
    contactName: "Vikas Patel",
    phone: "9876543210",
    city: "Ahmedabad",
    stateCode: "GJ",
    customerType: "B2C",
  });
  assert.equal(completeProfile, true, "Valid B2C profile must be complete");

  const incompleteB2B = isCustomerProfileComplete({
    contactName: "Vikas Patel",
    phone: "9876543210",
    city: "Ahmedabad",
    stateCode: "GJ",
    customerType: "B2B",
    companyName: "",
  });
  assert.equal(incompleteB2B, false, "B2B without company name must be incomplete");

  const completeB2B = isCustomerProfileComplete({
    contactName: "Vikas Patel",
    companyName: "Mahavir Printers",
    phone: "9876543210",
    city: "Ahmedabad",
    stateCode: "GJ",
    customerType: "B2B",
  });
  assert.equal(completeB2B, true, "B2B with company name must be complete");
  console.log("✓ Profile completion validation passed for B2C & B2B");

  console.log("\n=== ALL 11 VERIFICATION TEST SUITES PASSED PERFECTLY ===");
}

runSuite().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
