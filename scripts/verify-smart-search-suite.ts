import { config as loadDotenv } from "dotenv";
loadDotenv({ path: ".env.local" });

import assert from "node:assert/strict";
import { eq } from "drizzle-orm";

import { rankProducts, normalizeQuery, extractRequirement, type ProductSearchCandidate } from "../src/lib/search-engine";
import { evaluateStateAvailability } from "../src/lib/state-availability";

async function main() {
  console.log("\n========================================================");
  console.log("MAHAVIR CARD — SMART SEARCH & STATE AVAILABILITY SUITE");
  console.log("========================================================\n");

  // Sample catalog candidate products representing real Mahavir Card DB
  const mockCatalog: ProductSearchCandidate[] = [
    {
      id: "prod-1",
      name: "350 GSM Art Card Visiting Card",
      slug: "350-gsm-art-card-visiting-card",
      description: "Standard commercial 350 GSM art card offset printed",
      shortDescription: "350 GSM Art Card · Front & Back Print",
      category: { name: "Visiting Card", slug: "visiting-card" },
      listingSpecification: "350 GSM Art Card",
      productSize: "90x53 mm",
      orderable: true,
      quoteable: true,
    },
    {
      id: "prod-2",
      name: "400 GSM Thermal Matt Visiting Card",
      slug: "400-gsm-thermal-matt-visiting-card",
      description: "Premium 400 GSM thermal matt lamination with velvet feel",
      shortDescription: "400 GSM Thermal Matt Finish",
      category: { name: "Visiting Card", slug: "visiting-card" },
      listingSpecification: "400 GSM Thermal Matt",
      productSize: "90x53 mm",
      orderable: true,
      quoteable: true,
    },
    {
      id: "prod-3",
      name: "Premium Spot UV Visiting Card",
      slug: "premium-spot-uv-visiting-card",
      description: "Raised spot gloss UV embellishment on 400 GSM thermal matt card",
      shortDescription: "Spot UV Gloss · 400 GSM",
      category: { name: "Premium Card", slug: "premium-card" },
      listingSpecification: "Spot UV Gloss",
      productSize: "90x53 mm",
      orderable: true,
      quoteable: true,
    },
    {
      id: "prod-4",
      name: "250 GSM Trifold Brochure",
      slug: "250-gsm-trifold-brochure",
      description: "Full colour trifold corporate brochure printed on 250 GSM art paper",
      shortDescription: "A4 Trifold Brochure · 250 GSM",
      category: { name: "Brochure", slug: "brochure" },
      listingSpecification: "250 GSM Art Paper · Trifold",
      productSize: "A4 (8.27x11.69 in)",
      orderable: false,
      quoteable: true,
    },
    {
      id: "prod-5",
      name: "Custom Die Cut Sticker",
      slug: "custom-die-cut-sticker",
      description: "Adhesive sheet label printed for packaging, bottle or branding",
      shortDescription: "Adhesive Vinyl & Chromo Sticker",
      category: { name: "Sticker", slug: "sticker" },
      listingSpecification: "Adhesive Sticker",
      productSize: "2x3 inch",
      orderable: true,
      quoteable: true,
    },
    {
      id: "prod-6",
      name: "Executive Letterhead 100 GSM",
      slug: "executive-letterhead-100-gsm",
      description: "Corporate letterhead on 100 GSM royal executive bond paper",
      shortDescription: "100 GSM Bond Paper Letterhead",
      category: { name: "Letterhead / Envelope", slug: "letterhead-envelope" },
      listingSpecification: "100 GSM Bond Paper",
      productSize: "A4",
      orderable: true,
      quoteable: true,
    },
    {
      id: "prod-7",
      name: "Commercial Envelope A8 / DL",
      slug: "commercial-envelope-a8-dl",
      description: "Printed office mailing envelope with self-seal tape",
      shortDescription: "DL Window & Plain Envelope",
      category: { name: "Letterhead / Envelope", slug: "letterhead-envelope" },
      listingSpecification: "100 GSM Maplitho Envelope",
      productSize: "DL / A8",
      orderable: true,
      quoteable: true,
    },
  ];

  console.log("1. Normalization & Synonym Resolution Tests:");
  const testCases = [
    { query: "visiting crd", expectSynonym: "visiting card" },
    { query: "business card", expectSynonym: "visiting card" },
    { query: "thermel matt", expectSynonym: "thermal matt" },
    { query: "letter head", expectSynonym: "letterhead" },
    { query: "envelop", expectSynonym: "envelope" },
    { query: "stikars", expectSynonym: "sticker" },
    { query: "brocher", expectSynonym: "brochure" },
    { query: "spot uv", expectSynonym: "uv" },
  ];

  for (const tc of testCases) {
    const norm = normalizeQuery(tc.query);
    assert.ok(
      norm.normalized.includes(tc.expectSynonym),
      `Failed: "${tc.query}" normalized to "${norm.normalized}", expected to contain "${tc.expectSynonym}"`
    );
    console.log(`  ✓ "${tc.query}" -> "${norm.normalized}"`);
  }

  console.log("\n2. Fuzzy Typo & Search Quality Verification:");
  const typoSearches = [
    { query: "visiting crd", topExpected: "prod-1" },
    { query: "vistng card", topExpected: "prod-1" },
    { query: "thermel", topExpected: "prod-2" },
    { query: "business card", topExpected: "prod-1" },
    { query: "brocher", topExpected: "prod-4" },
    { query: "stiker 2x3", topExpected: "prod-5" },
    { query: "spot uv", topExpected: "prod-3" },
    { query: "letter head", topExpected: "prod-6" },
  ];

  for (const s of typoSearches) {
    const res = rankProducts(mockCatalog, s.query);
    assert.ok(res.results.length > 0, `Query "${s.query}" returned 0 results!`);
    assert.equal(res.confidence, "HIGH", `Query "${s.query}" should have HIGH confidence`);
    const foundIds = res.results.map((r) => r.id);
    assert.ok(
      foundIds.includes(s.topExpected),
      `Expected ${s.topExpected} in results for "${s.query}", got ${foundIds.join(", ")}`
    );
    console.log(`  ✓ "${s.query}" -> matched ${res.results.length} items (${res.results[0].name})`);
  }

  console.log("\n3. Relevance Ranking Verification:");
  // "thermal matt" should rank "400 GSM Thermal Matt Visiting Card" above "350 GSM Art Card"
  const rankRes = rankProducts(mockCatalog, "thermal matt");
  assert.equal(rankRes.results[0].id, "prod-2", "Thermal Matt should be #1 for 'thermal matt'");
  console.log(`  ✓ "thermal matt" correctly ranked "${rankRes.results[0].name}" as #1`);

  // "brochure" should rank brochure ahead of cards
  const brochureRes = rankProducts(mockCatalog, "brochure");
  assert.equal(brochureRes.results[0].id, "prod-4", "Brochure should be #1 for 'brochure'");
  console.log(`  ✓ "brochure" correctly ranked "${brochureRes.results[0].name}" as #1`);

  console.log("\n4. Low & No-Match Confidence Thresholding:");
  // Completely unrelated query should NOT return random fake products!
  const zeroRes = rankProducts(mockCatalog, "unobtainium rocket propeller space suit");
  assert.equal(zeroRes.confidence, "NONE", "Unrelated query should have confidence NONE");
  assert.equal(zeroRes.results.length, 0, "Unrelated query should return 0 results");
  assert.equal(zeroRes.fallbackQuoteAvailable, true, "Fallback quote should be offered on 0 results");
  console.log(`  ✓ Zero match handled with confidence: ${zeroRes.confidence}, 0 items displayed`);

  console.log("\n5. Requirement Extraction for Quote Pre-fill:");
  const sampleReq = extractRequirement("400 gsm velvet visiting card 2000 quantity");
  assert.equal(sampleReq.categorySlug, "premium-card");
  assert.equal(sampleReq.finish, "Velvet Soft-Touch");
  assert.equal(sampleReq.gsm, "400 GSM");
  assert.equal(sampleReq.quantity, 2000);
  console.log("  ✓ Extracted Requirement:", sampleReq);

  console.log("\n6. State Availability Evaluation Verification:");
  const productGJOnly = {
    id: "prod-1",
    name: "350 GSM Art Card Visiting Card",
    slug: "350-gsm-art-card",
    orderable: true,
    quoteable: true,
  };
  const deliveryRules = [
    { deliveryMethod: "PICKUP", stateCode: "*", isActive: true },
    { deliveryMethod: "COURIER", stateCode: "GJ", isActive: true },
  ];

  // Gujarat customer
  const gjAvail = evaluateStateAvailability(productGJOnly, deliveryRules, "GJ");
  assert.equal(gjAvail.isAvailable, true);
  assert.equal(gjAvail.status, "AVAILABLE");
  console.log(`  ✓ State GJ: isAvailable = true (${gjAvail.badgeText})`);

  // Rajasthan customer (not in rules)
  const rjAvail = evaluateStateAvailability(productGJOnly, deliveryRules, "RJ");
  assert.equal(rjAvail.isAvailable, false);
  assert.equal(rjAvail.status, "UNAVAILABLE_IN_STATE");
  assert.ok(rjAvail.quotePrompt !== null, "Should provide quote prompt for unavailable state");
  assert.equal(rjAvail.fallbackQuoteContext?.customerState, "RJ");
  console.log(`  ✓ State RJ: isAvailable = false -> Fallback Quote prompt provided: "${rjAvail.quotePrompt}"`);

  // Wildcard courier product
  const nationalRules = [
    { deliveryMethod: "COURIER", stateCode: "*", isActive: true },
  ];
  const mhAvail = evaluateStateAvailability(productGJOnly, nationalRules, "MH");
  assert.equal(mhAvail.isAvailable, true);
  assert.equal(mhAvail.status, "AVAILABLE");
  console.log(`  ✓ State MH (Wildcard): isAvailable = true`);

  console.log("\n7. PostgreSQL Real DB Telemetry Verification:");
  const { db } = await import("../src/lib/db/server");
  const { searchLogs } = await import("../src/lib/db/schema");

  const [testLog] = await db.insert(searchLogs).values({
    query: "test verification query visiting crd",
    normalizedQuery: "visiting card",
    customerState: "GJ",
    customerType: "TEST_RUNNER",
    resultCount: 5,
    confidence: "HIGH",
    quoteFallbackInitiated: true,
  }).returning();

  assert.ok(testLog && testLog.id, "Telemetry log should be inserted");
  console.log(`  ✓ Telemetry verified in PostgreSQL: id ${testLog.id} (query: "${testLog.query}")`);

  // Cleanup test log
  await db.delete(searchLogs).where(eq(searchLogs.id, testLog.id));
  console.log("  ✓ Test telemetry record cleaned up");

  console.log("\n========================================================");
  console.log("ALL 7 SMART SEARCH & STATE AVAILABILITY SUITES PASSED! ✓");
  console.log("========================================================\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
