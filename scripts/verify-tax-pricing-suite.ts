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

  // Test 1: Gujarat customer, Base ₹240 -> CGST 21.60, SGST 21.60, IGST 0, Unrounded 283.20, Paisa Round-off -0.20, Grand Total 283.00
  const t1 = calculateTax({ taxableSubtotal: 240, stateCode: "GJ", taxRate: 18 });
  console.log("Test 1 (GJ ₹240):", t1);
  assert.equal(t1.taxableSubtotal, "240.00");
  assert.equal(t1.cgstAmount, "21.60");
  assert.equal(t1.sgstAmount, "21.60");
  assert.equal(t1.igstAmount, "0.00");
  assert.equal(t1.taxAmount, "43.20");
  assert.equal(t1.unroundedTotal, "283.20");
  assert.equal(t1.roundOff, "-0.20");
  assert.equal(t1.grandTotal, "283.00");
  assert.equal(t1.taxType, "INTRA_STATE");
  assert.equal(t1.customerState, "GJ");
  console.log("✓ Test 1 PASSED: Gujarat ₹240 -> CGST ₹21.60 + SGST ₹21.60 = ₹283.20 -> Paisa adjustment: -₹0.20 -> Grand Total: ₹283.00");

  // Test 2: Rajasthan customer, Base ₹240 -> CGST 0, SGST 0, IGST 43.20, Unrounded 283.20, Paisa Round-off -0.20, Grand Total 283.00
  const t2 = calculateTax({ taxableSubtotal: 240, stateCode: "RJ", taxRate: 18 });
  console.log("Test 2 (RJ ₹240):", t2);
  assert.equal(t2.taxableSubtotal, "240.00");
  assert.equal(t2.cgstAmount, "0.00");
  assert.equal(t2.sgstAmount, "0.00");
  assert.equal(t2.igstAmount, "43.20");
  assert.equal(t2.taxAmount, "43.20");
  assert.equal(t2.unroundedTotal, "283.20");
  assert.equal(t2.roundOff, "-0.20");
  assert.equal(t2.grandTotal, "283.00");
  assert.equal(t2.taxType, "INTER_STATE");
  assert.equal(t2.customerState, "RJ");
  console.log("✓ Test 2 PASSED: Rajasthan ₹240 -> IGST ₹43.20 -> Paisa adjustment: -₹0.20 -> Grand Total: ₹283.00");

  // Test 2b: Rounding up when paisa >= 0.50 (e.g. Subtotal ₹105.40 + 18% GST ₹18.98 = ₹124.38 -> under 50p rounds down to ₹124.00)
  // Subtotal ₹105.70 + 18% GST (9% CGST 9.51 + 9% SGST 9.51 = ₹19.02) = ₹124.72 -> above 50p rounds up to ₹125.00 (+0.28)
  const t2b = calculateTax({ taxableSubtotal: 105.70, stateCode: "GJ", taxRate: 18 });
  assert.equal(t2b.grandTotal, "125.00");
  assert.equal(t2b.roundOff, "+0.28");
  console.log("✓ Test 2b PASSED: Above 50 paisa rounds up to next whole number (₹124.72 -> ₹125.00, +₹0.28)");

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
  assert.equal(scenA.unroundedTotal, "330.40");
  assert.equal(scenA.roundOff, "-0.40");
  assert.equal(scenA.grandTotal, "330.00");
  console.log("✓ Scenario A PASSED: NT Single + GJ Courier -> Base ₹240 + Courier ₹40 + CGST ₹25.20 + SGST ₹25.20 = ₹330.40 -> Paisa adjustment -₹0.40 = ₹330.00");

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
  // 1000 cards, 3x3 = 9 sq.in each, rate = 33 -> 9 * 33 = 297 (> 250 min charge)
  const scenC = await calculateProductPrice(stickerProduct.id, 1000, { width: 3, height: 3, bladeCount: 0 }, {
    stateCode: "GJ",
  });
  console.log("Scenario C (Sticker 3x3) result:", scenC);
  assert.ok(scenC, "Scenario C calculation must succeed");
  assert.equal(scenC.productPrice, "297.00");
  assert.equal(scenC.cgstAmount, "26.73");
  assert.equal(scenC.sgstAmount, "26.73");
  assert.equal(scenC.unroundedTotal, "350.46");
  assert.equal(scenC.roundOff, "-0.46");
  assert.equal(scenC.grandTotal, "350.00");
  console.log("✓ Scenario C PASSED: Sticker square-inch 3x3 @ ₹33 = ₹297 + GST = ₹350.46 -> Paisa adjustment -₹0.46 = ₹350.00");

  // Scenario C2: Sticker square-inch min-charge calculation (2x3 = 6 sq.in * 33 = 198 < 250)
  const scenC2 = await calculateProductPrice(stickerProduct.id, 1000, { width: 2, height: 3, bladeCount: 0 }, {
    stateCode: "GJ",
  });
  console.log("Scenario C2 (Sticker 2x3 min charge) result:", scenC2);
  assert.ok(scenC2, "Scenario C2 calculation must succeed");
  assert.equal(scenC2.productPrice, "250.00");
  assert.equal(scenC2.cgstAmount, "22.50");
  assert.equal(scenC2.sgstAmount, "22.50");
  assert.equal(scenC2.grandTotal, "295.00");
  console.log("✓ Scenario C2 PASSED: Sticker square-inch 2x3 min-charge ₹250 + GST = ₹295.00");

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

  // Special products (Art Card / Premium Card): 500 increments
  assert.equal(normalizeProductQuantity(1, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 500);
  assert.equal(normalizeProductQuantity(500, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 500);
  assert.equal(normalizeProductQuantity(501, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(1000, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(1001, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 1500);
  assert.equal(normalizeProductQuantity(1501, "premium-card", "premium-400-gsm-velvet").normalizedQuantity, 2000);
  // Drip-off is standard 1000
  assert.equal(normalizeProductQuantity(1001, "premium-card", "premium-400-gsm-dripoff-front-back").normalizedQuantity, 2000);
  console.log("✓ Premium / Art Card special 500-increment normalization verified");

  // Stepper stepProductQuantity
  assert.equal(stepProductQuantity(1000, "UP", "visiting-card", "nt-single"), 2000);
  assert.equal(stepProductQuantity(2000, "DOWN", "visiting-card", "nt-single"), 1000);
  assert.equal(stepProductQuantity(1000, "DOWN", "visiting-card", "nt-single"), 1000);
  assert.equal(stepProductQuantity(500, "UP", "premium-card", "premium-400-gsm-velvet"), 1000);
  assert.equal(stepProductQuantity(1000, "UP", "premium-card", "premium-400-gsm-velvet"), 1500);
  assert.equal(stepProductQuantity(1500, "UP", "premium-card", "premium-400-gsm-velvet"), 2000);
  assert.equal(stepProductQuantity(2000, "DOWN", "premium-card", "premium-400-gsm-velvet"), 1500);
  assert.equal(stepProductQuantity(1500, "DOWN", "premium-card", "premium-400-gsm-velvet"), 1000);
  assert.equal(stepProductQuantity(1000, "DOWN", "premium-card", "premium-400-gsm-velvet"), 500);
  assert.equal(stepProductQuantity(500, "DOWN", "premium-card", "premium-400-gsm-velvet"), 500);
  // Drip-off uses 1000 step
  assert.equal(stepProductQuantity(1000, "UP", "premium-card", "premium-400-gsm-dripoff-front-back"), 2000);
  assert.equal(stepProductQuantity(1000, "DOWN", "premium-card", "premium-400-gsm-dripoff-front-back"), 1000);
  console.log("✓ Stepper stepProductQuantity verified (500 increments for premium/art, 1000 for drip-off/standard)");

  // -------------------------------------------------------------
  // PART 6: CORNER CUT ADDON ON SPECIFIC THERMAL MATT CARDS & SCALING
  // -------------------------------------------------------------
  console.log("\n--- Part 6: Corner Cut Addon on Thermal Matt Cards & Scaling ---");
  const { productAddons, addons } = await import("../src/lib/db/schema");
  const thermalMattWithCornerCut = [
    "400-gsm-thermal-matt-single-front-back",
    "400-gsm-thermal-matt-single-side-uv",
    "400-gsm-thermal-matt-front-back-uv",
  ];

  for (const tmSlug of thermalMattWithCornerCut) {
    const [tmProd] = await db.select().from(products).where(eq(products.slug, tmSlug)).limit(1);
    assert.ok(tmProd, `Product ${tmSlug} must exist`);
    const attachedAddons = await db.select({
      addon: addons,
      productAddon: productAddons,
    }).from(productAddons).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.productId, tmProd.id), eq(productAddons.isActive, true)));
    const cornerCut = attachedAddons.find((a) => a.addon.code === "CORNER_CUT");
    assert.ok(cornerCut, `Corner Cut addon must be attached to ${tmSlug}`);
    assert.equal(Number(cornerCut.productAddon.price), 300, `Corner Cut base price on ${tmSlug} must be ₹300`);
    console.log(`✓ ${tmSlug} has Corner Cut addon configured @ ₹300/1000`);
  }

  // 350 GSM Texture must NOT have Corner Cut
  const [textureProd] = await db.select().from(products).where(eq(products.slug, "350-gsm-thermal-matt-texture")).limit(1);
  assert.ok(textureProd, "350 GSM Texture product must exist");
  const textureAddons = await db.select({
    addon: addons,
    productAddon: productAddons,
  }).from(productAddons).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.productId, textureProd.id), eq(productAddons.isActive, true)));
  const textureCornerCut = textureAddons.find((a) => a.addon.code === "CORNER_CUT");
  assert.equal(textureCornerCut, undefined, "350 GSM Texture must NOT have Corner Cut addon");
  console.log("✓ 350 GSM Texture verified: Corner Cut is NOT available");

  // Verify Corner Cut scaling with calculateProductPrice (1000 -> ₹300, 2000 -> ₹600, 3000 -> ₹900)
  const [tmSingle] = await db.select().from(products).where(eq(products.slug, "400-gsm-thermal-matt-single-front-back")).limit(1);
  const [ccAddonRow] = await db.select().from(addons).where(eq(addons.code, "CORNER_CUT")).limit(1);
  assert.ok(ccAddonRow, "CORNER_CUT addon row must exist");

  const tm1000 = await calculateProductPrice(tmSingle.id, 1000, {}, { addonIds: [ccAddonRow.id], stateCode: "GJ" });
  assert.ok(tm1000, "1000 cards price calc failed");
  assert.equal(tm1000.addons[0].price, "300.00", "Corner Cut for 1000 cards must be ₹300");

  const tm2000 = await calculateProductPrice(tmSingle.id, 2000, {}, { addonIds: [ccAddonRow.id], stateCode: "GJ" });
  assert.ok(tm2000, "2000 cards price calc failed");
  assert.equal(tm2000.addons[0].price, "600.00", "Corner Cut for 2000 cards must be ₹600");

  const tm3000 = await calculateProductPrice(tmSingle.id, 3000, {}, { addonIds: [ccAddonRow.id], stateCode: "GJ" });
  assert.ok(tm3000, "3000 cards price calc failed");
  assert.equal(tm3000.addons[0].price, "900.00", "Corner Cut for 3000 cards must be ₹900");
  console.log("✓ Corner Cut scaling verified: 1000 -> ₹300, 2000 -> ₹600, 3000 -> ₹900");

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

  // -------------------------------------------------------------
  // PART 9: BROCHURE RULES (quoteable: false, productionTime: 4-5 working days)
  // -------------------------------------------------------------
  console.log("\n--- Part 9: Brochure Rules Check ---");
  const brochures = await db.select().from(products).where(and(eq(products.productClass, "Brochure"), eq(products.isActive, true)));
  for (const b of brochures) {
    assert.equal(b.quoteable, false, `Brochure ${b.slug} must have quoteable: false`);
    assert.equal(b.productionTime, "4-5 working days", `Brochure ${b.slug} productionTime must be '4-5 working days'`);
    assert.ok(b.name.includes("250 GSM"), `Brochure ${b.slug} name '${b.name}' must contain '250 GSM'`);
    assert.ok((b.description || "").includes("250 GSM"), `Brochure ${b.slug} description '${b.description}' must contain '250 GSM'`);
  }
  console.log(`✓ All ${brochures.length} Brochure products verified with quoteable: false, 4-5 working days & 250 GSM name/description`);

  // -------------------------------------------------------------
  // PART 10: ART CARD, BLADE PRICING, & PREMIUM CARD CHECKS
  // -------------------------------------------------------------
  console.log("\n--- Part 10: Art Card, Blade Pricing & Premium Card Checks ---");

  // 1. Art Card Single Side checks
  const [artSingle] = await db.select().from(products).where(eq(products.slug, "art-card-single-side")).limit(1);
  assert.ok(artSingle, "Art Card Single Side product must exist");
  assert.equal(artSingle.name, "250 GSM Art Card Single Side", "Art Card customer-facing name must include 250 GSM");
  assert.equal(artSingle.productionTime, "3-4 working days", "Art Card production time must be '3-4 working days'");
  assert.equal(artSingle.referenceQuantity, 1000, "Art Card Single Side reference quantity must be 1000");

  const calcArtSingle = await calculateProductPrice(artSingle.id, 1000, { width: "2", height: "5" }, { stateCode: "GJ" });
  assert.ok(calcArtSingle, "Art Card Single Side price calculation failed");
  // 10 sq. in * 28 = 280
  assert.equal(calcArtSingle.productPrice, "280.00", "Art Card Single Side 10 sq.in at ₹28 must be ₹280.00");
  assert.equal(calcArtSingle.breakdown?.basePrice, "280.00");
  console.log("✓ Art Card Single Side: name='250 GSM Art Card Single Side', 3-4 working days, 1000 qty, ₹28/sq.in verified");

  // 2. Art Card Both Side checks
  const [artBoth] = await db.select().from(products).where(eq(products.slug, "art-card-both-side")).limit(1);
  assert.ok(artBoth, "Art Card Both Side product must exist");
  assert.equal(artBoth.name, "250 GSM Art Card Both Side", "Art Card Both Side name must include 250 GSM");
  assert.equal(artBoth.productionTime, "3-4 working days", "Art Card Both Side production time must be '3-4 working days'");
  assert.equal(artBoth.referenceQuantity, 1000, "Art Card Both Side reference quantity must be 1000");

  // Test minimum 50 sq. in. rejection
  let minAreaFailed = false;
  try {
    await calculateProductPrice(artBoth.id, 1000, { width: "5", height: "5" }, { stateCode: "GJ" });
  } catch (err) {
    minAreaFailed = true;
    const message = err instanceof Error ? err.message : String(err);
    assert.ok(message.includes("50 square inches"), "Should reject < 50 sq inches");
  }
  assert.ok(minAreaFailed, "Art Card Both Side must reject < 50 sq. in.");

  // Test 50 sq. in. price: 50 * 33 = 1650
  const calcArtBoth = await calculateProductPrice(artBoth.id, 1000, { width: "10", height: "5" }, { stateCode: "GJ" });
  assert.ok(calcArtBoth, "Art Card Both Side 50 sq.in calculation failed");
  assert.equal(calcArtBoth.productPrice, "1650.00", "Art Card Both Side 50 sq.in at ₹33 must be ₹1650.00");
  console.log("✓ Art Card Both Side: name='250 GSM Art Card Both Side', 50 sq.in minimum enforced, 1000 qty, ₹33/sq.in rate verified");

  // 3. Art Card Both Side Lamination checks
  const [artLam] = await db.select().from(products).where(eq(products.slug, "art-card-both-side-lamination")).limit(1);
  assert.ok(artLam, "Art Card Both Side Lamination product must exist");
  assert.equal(artLam.name, "250 GSM Art Card Both Side Lamination", "Art Card Both Side Lamination name must include 250 GSM");
  assert.equal(artLam.productionTime, "3-4 working days", "Art Card Both Side Lamination production time must be '3-4 working days'");
  assert.equal(artLam.referenceQuantity, 1000, "Art Card Both Side Lamination reference quantity must be 1000");

  const calcArtLam = await calculateProductPrice(artLam.id, 1000, { width: "2", height: "5" }, { stateCode: "GJ" });
  assert.ok(calcArtLam, "Art Card Both Side Lamination calculation failed");
  // 10 sq. in * 37 = 370
  assert.equal(calcArtLam.productPrice, "370.00", "Art Card Both Side Lamination 10 sq.in at ₹37 must be ₹370.00");
  console.log("✓ Art Card Both Side Lamination: name='250 GSM Art Card Both Side Lamination', 1000 reference quantity, ₹37/sq.in rate verified");

  // 4. Quantity helper rules for Art Card (all 1000 quantity)
  assert.equal(normalizeProductQuantity(null, "art-card", "art-card-single-side").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(null, "art-card", "art-card-both-side").normalizedQuantity, 1000);
  assert.equal(normalizeProductQuantity(null, "art-card", "art-card-both-side-lamination").normalizedQuantity, 1000);
  assert.equal(stepProductQuantity(1000, "UP", "art-card", "art-card-single-side"), 2000);
  assert.equal(stepProductQuantity(2000, "DOWN", "art-card", "art-card-single-side"), 1000);
  assert.equal(stepProductQuantity(1000, "DOWN", "art-card", "art-card-both-side-lamination"), 1000);
  console.log("✓ Quantity rules: ALL Art Cards = 1000 quantity with 1000 increments verified");

  // 5. Blade charges verification (₹50 / blade)
  const [stickerProd] = await db.select().from(products).where(eq(products.slug, "sticker-without-lamination")).limit(1);
  assert.ok(stickerProd, "Sticker product must exist");

  const blade0 = await calculateProductPrice(stickerProd.id, 1000, { width: "2", height: "2", bladeCount: "0" }, { stateCode: "GJ" });
  assert.equal(blade0?.blade, null, "0 blades should have null blade line item");

  const blade1 = await calculateProductPrice(stickerProd.id, 1000, { width: "2", height: "2", bladeCount: "1" }, { stateCode: "GJ" });
  assert.ok(blade1?.blade, "1 blade line item must exist");
  assert.equal(blade1.blade.count, 1);
  assert.equal(blade1.blade.rate, "50.00");
  assert.equal(blade1.blade.amount, "50.00");
  assert.equal(blade1.productPrice, "250.00"); // Base price is minimum charge ₹250, strictly separated from blade
  assert.equal(blade1.taxableSubtotal, "300.00"); // 250 + 50 = 300

  const blade2 = await calculateProductPrice(stickerProd.id, 1000, { width: "2", height: "2", bladeCount: "2" }, { stateCode: "GJ" });
  assert.equal(blade2?.blade?.amount, "100.00", "2 blades must be ₹100.00");
  assert.equal(blade2.taxableSubtotal, "350.00"); // 250 + 100 = 350

  const blade3 = await calculateProductPrice(stickerProd.id, 1000, { width: "2", height: "2", bladeCount: "3" }, { stateCode: "GJ" });
  assert.equal(blade3?.blade?.amount, "150.00", "3 blades must be ₹150.00");
  assert.equal(blade3.taxableSubtotal, "400.00"); // 250 + 150 = 400
  console.log("✓ Blade pricing verified: ₹50 / blade (1 -> ₹50, 2 -> ₹100, 3 -> ₹150) separated from base price");

  // 6. Premium Card Corner Cut included by default & 500 Quantity Pricing
  const [premCard] = await db.select().from(products).where(eq(products.slug, "premium-400-gsm-velvet")).limit(1);
  assert.ok(premCard, "Premium Card Velvet product must exist");
  assert.equal(premCard.referenceQuantity, 500, "Premium 400 GSM Velvet reference quantity must be 500");
  const premAddons = await db.select().from(productAddons).where(and(eq(productAddons.productId, premCard.id), eq(productAddons.isActive, true)));
  assert.equal(premAddons.length, 0, "Premium Card should have no separate add-on charge for Corner Cut");

  // ₹746 for 500 cards
  const calcPrem500 = await calculateProductPrice(premCard.id, 500, {}, { stateCode: "GJ" });
  assert.equal(calcPrem500?.productPrice, "746.00", "Premium 400 GSM Velvet for 500 cards must be ₹746.00");

  // 1000 cards = 2 * 746 = 1492
  const calcPrem1000 = await calculateProductPrice(premCard.id, 1000, {}, { stateCode: "GJ" });
  assert.equal(calcPrem1000?.productPrice, "1492.00", "Premium 400 GSM Velvet for 1000 cards must be ₹1492.00");

  // 1500 cards = 3 * 746 = 2238
  const calcPrem1500 = await calculateProductPrice(premCard.id, 1500, {}, { stateCode: "GJ" });
  assert.equal(calcPrem1500?.productPrice, "2238.00", "Premium 400 GSM Velvet for 1500 cards must be ₹2238.00");

  // Drip-off is for 1000 cards
  const [dripOff] = await db.select().from(products).where(eq(products.slug, "premium-400-gsm-dripoff-front-back")).limit(1);
  assert.ok(dripOff, "Drip-Off product must exist");
  assert.equal(dripOff.referenceQuantity, 1000, "Drip-Off reference quantity must be 1000");
  const calcDrip1000 = await calculateProductPrice(dripOff.id, 1000, {}, { stateCode: "GJ" });
  assert.equal(calcDrip1000?.productPrice, "1102.00", "Drip-Off for 1000 cards must be ₹1102.00");

  console.log("✓ Premium Card verified: 500 quantity pricing for velvet/UV/foil, 1000 for drip-off, corner cut included");

  console.log("\n=== ALL VERIFICATION TEST SUITES PASSED PERFECTLY ===");
}

runSuite().catch((err) => {
  console.error("FATAL TEST FAILURE:", err);
  process.exit(1);
});
