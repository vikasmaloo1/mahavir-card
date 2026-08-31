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
  assert.ok(gjRule && Number(gjRule.price) === 40, "Visiting Card GJ Courier must be ₹40");
  assert.ok(rjRule && Number(rjRule.price) === 60, "Visiting Card RJ Courier must be ₹60");
  console.log("✓ Visiting Card NT Single Delivery Rules verified (GJ: ₹40, RJ: ₹60)");

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

  // Scenario A: Customer Gujarat, Business Card NT Single 1000, Courier (₹40)
  // Base ₹240 + Courier ₹40 = ₹280 taxable -> CGST 9% (₹25.20) + SGST 9% (₹25.20) -> Total ₹330.40
  const scenA = await calculateProductPrice(ntSingle.id, 1000, {}, {
    stateCode: "GJ",
    delivery: { method: "COURIER", stateCode: "GJ" },
  });
  console.log("Scenario A result:", scenA);
  assert.ok(scenA, "Scenario A calculation must succeed");
  assert.equal(scenA.productPrice, "240.00");
  assert.equal(scenA.delivery.price, "40.00");
  assert.equal(scenA.priceBeforeTax, "280.00");
  assert.equal(scenA.cgstAmount, "25.20");
  assert.equal(scenA.sgstAmount, "25.20");
  assert.equal(scenA.igstAmount, "0.00");
  assert.equal(scenA.grandTotal, "330.40");
  console.log("✓ Scenario A PASSED: NT Single + GJ Courier -> Base ₹240 + Courier ₹40 + CGST ₹25.20 + SGST ₹25.20 = ₹330.40");

  // Scenario B: Customer Rajasthan, Business Card NT Single 1000, Courier (₹60)
  // Base ₹240 + Courier ₹60 = ₹300 taxable -> IGST 18% (₹54.00) -> Total ₹354.00
  const scenB = await calculateProductPrice(ntSingle.id, 1000, {}, {
    stateCode: "RJ",
    delivery: { method: "COURIER", stateCode: "RJ" },
  });
  console.log("Scenario B result:", scenB);
  assert.ok(scenB, "Scenario B calculation must succeed");
  assert.equal(scenB.productPrice, "240.00");
  assert.equal(scenB.delivery.price, "60.00");
  assert.equal(scenB.priceBeforeTax, "300.00");
  assert.equal(scenB.cgstAmount, "0.00");
  assert.equal(scenB.sgstAmount, "0.00");
  assert.equal(scenB.igstAmount, "54.00");
  assert.equal(scenB.grandTotal, "354.00");
  console.log("✓ Scenario B PASSED: NT Single + RJ Courier -> Base ₹240 + Courier ₹60 + IGST ₹54.00 = ₹354.00");

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

  // -------------------------------------------------------------
  // PART 5: QUANTITY NORMALIZATION & STEPPER LOGIC
  // -------------------------------------------------------------
  console.log("\n--- Part 5: Quantity Normalization & Stepper Rules ---");
  const { normalizeProductQuantity, stepProductQuantity } = await import("../src/lib/quantity-helper");

  // Standard product normalization: 1000 step
  assert.equal(normalizeProductQuantity(1, "visiting-card", "nt-single").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(999, "visiting-card", "nt-single").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(1000, "visiting-card", "nt-single").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(1001, "visiting-card", "nt-single").normalizedQuantity, 2000);
  assert.equal(normalizeProductQuantity(1020, "visiting-card", "nt-single").normalizedQuantity, 2000);
  assert.equal(normalizeProductQuantity(1500, "visiting-card", "nt-single").normalizedQuantity, 2000);
  assert.equal(normalizeProductQuantity(1999, "visiting-card", "nt-single").normalizedQuantity, 2000);
  assert.equal(normalizeProductQuantity(2000, "visiting-card", "nt-single").normalizedQuantity, 2000);
  assert.equal(normalizeProductQuantity(2001, "visiting-card", "nt-single").normalizedQuantity, 3000);
  console.log("✓ Standard quantity normalization (1001->2000, 1020->2000, 1500->2000) verified");

  // Special products (Art Card / Premium Card): 500 first step, then 1000
  assert.equal(normalizeProductQuantity(1, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 500);
  assert.equal(normalizeProductQuantity(500, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 500);
  assert.equal(normalizeProductQuantity(501, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(1000, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(1001, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 2000);
  console.log("✓ Premium / Art Card special 500-step normalization verified");

  // Stepper stepProductQuantity
  assert.equal(stepProductQuantity(1000, "UP", "visiting-card", "nt-single"), 2000);
  assert.equal(stepProductQuantity(2000, "DOWN", "visiting-card", "nt-single"), 1000);
  assert.equal(stepProductQuantity(1000, "DOWN", "visiting-card", "nt-single"), 1000);
  assert.equal(stepProductQuantity(500, "UP", "premium-card", "premium-400-gsm-velvet"), 1000);
  assert.equal(stepProductQuantity(1000, "DOWN", "premium-card", "premium-400-gsm-velvet"), 500);
  console.log("✓ Stepper stepProductQuantity verified");

  // -------------------------------------------------------------
  // PART 6: CORNER CUT ADDON ON ALL 4 THERMAL MATT CARDS & SCALING
  // -------------------------------------------------------------
  console.log("\n--- Part 6: Corner Cut Addon on 4 Thermal Matt Cards & Scaling ---");
  const { productAddons, addons } = await import("../src/lib/db/schema");
  const thermalMattSlugs = [
    "400-gsm-thermal-matt-single-front-back",
    "350-gsm-thermal-matt-texture",
    "400-gsm-thermal-matt-single-side-uv",
    "400-gsm-thermal-matt-front-back-uv",
  ];

  for (const tmSlug of thermalMattSlugs) {
    const [tmProd] = await db.select().from(products).where(eq(products.slug, tmSlug)).limit(1);
    assert.ok(tmProd, `Product ${tmSlug} must exist`);
    const attachedAddons = await db.select({
      addon: addons,
      productAddon: productAddons,
    }).from(productAddons).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.productId, tmProd.id), eq(productAddons.isActive, true)));
    const cornerCut = attachedAddons.find((a) => a.addon.code === "CORNER_CUT");
    assert.ok(cornerCut, `Corner Cut addon must be attached to ${tmSlug}`);
    assert.equal(Number(cornerCut.productAddon.price), 100, `Corner Cut base price on ${tmSlug} must be ₹100`);
    console.log(`✓ ${tmSlug} has Corner Cut addon configured @ ₹100/1000`);
  }

  // Verify Corner Cut scaling with calculateProductPrice (1000 -> ₹100, 2000 -> ₹200, 3000 -> ₹300)
  const [tmSingle] = await db.select().from(products).where(eq(products.slug, "400-gsm-thermal-matt-single-front-back")).limit(1);
  const [ccAddonRow] = await db.select().from(addons).where(eq(addons.code, "CORNER_CUT")).limit(1);
  assert.ok(ccAddonRow, "CORNER_CUT addon row must exist");

  const tm1000 = await calculateProductPrice(tmSingle.id, 1000, {}, { addonIds: [ccAddonRow.id], stateCode: "GJ" });
  assert.ok(tm1000, "1000 cards price calc failed");
  assert.equal(tm1000.addons[0].price, "100.00", "Corner Cut for 1000 cards must be ₹100");

  const tm2000 = await calculateProductPrice(tmSingle.id, 2000, {}, { addonIds: [ccAddonRow.id], stateCode: "GJ" });
  assert.ok(tm2000, "2000 cards price calc failed");
  assert.equal(tm2000.addons[0].price, "200.00", "Corner Cut for 2000 cards must be ₹200");

  const tm3000 = await calculateProductPrice(tmSingle.id, 3000, {}, { addonIds: [ccAddonRow.id], stateCode: "GJ" });
  assert.ok(tm3000, "3000 cards price calc failed");
  assert.equal(tm3000.addons[0].price, "300.00", "Corner Cut for 3000 cards must be ₹300");
  console.log("✓ Corner Cut scaling verified: 1000 -> ₹100, 2000 -> ₹200, 3000 -> ₹300");

  // -------------------------------------------------------------
  // PART 7: COURIER SCALING BY QUANTITY
  // -------------------------------------------------------------
  console.log("\n--- Part 7: Courier Delivery Quantity Scaling ---");
  // NT Single Courier: GJ is ₹40 per 1000 cards
  // 1000 cards -> ₹40
  // 2000 cards -> ₹80
  // 3000 cards -> ₹120
  const courier1000 = await calculateProductPrice(ntSingle.id, 1000, {}, { delivery: { method: "COURIER", stateCode: "GJ" }, stateCode: "GJ" });
  assert.equal(courier1000?.delivery.price, "40.00", "Courier for 1000 cards must be ₹40");

  const courier2000 = await calculateProductPrice(ntSingle.id, 2000, {}, { delivery: { method: "COURIER", stateCode: "GJ" }, stateCode: "GJ" });
  assert.equal(courier2000?.delivery.price, "80.00", "Courier for 2000 cards must be ₹80 (2 * 40)");

  const courier3000 = await calculateProductPrice(ntSingle.id, 3000, {}, { delivery: { method: "COURIER", stateCode: "GJ" }, stateCode: "GJ" });
  assert.equal(courier3000?.delivery.price, "120.00", "Courier for 3000 cards must be ₹120 (3 * 40)");
  console.log("✓ Courier scaling verified: 1000 cards -> ₹40, 2000 cards -> ₹80, 3000 cards -> ₹120");

  // -------------------------------------------------------------
  // PART 8: VISITING CARDS QUOTEABLE STATUS
  // -------------------------------------------------------------
  console.log("\n--- Part 8: Visiting Cards Quoteability Check ---");
  const visitingCards = await db.select().from(products).where(and(eq(products.productClass, "Visiting Card"), eq(products.isActive, true)));
  for (const vc of visitingCards) {
    assert.equal(vc.quoteable, false, `Visiting Card ${vc.slug} must have quoteable: false`);
  }
  console.log(`✓ All ${visitingCards.length} Visiting Card products verified with quoteable: false`);

  console.log("\n=== ALL VERIFICATION TEST SUITES PASSED PERFECTLY ===");
}

runSuite().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
