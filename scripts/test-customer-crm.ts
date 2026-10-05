import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import {
  formatWhatsAppPhone,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  getCustomerCatalogueMode,
  getCustomerCatalogueUrl,
  LEAD_STATUSES,
  isValidLeadStatus,
  isValidContactMethod,
} from "../src/lib/customer-whatsapp";

async function runTests() {
  const { db } = await import("../src/lib/db");
  const { customers } = await import("../src/lib/db/schema");
  const { eq, sql } = await import("drizzle-orm");
  console.log("=== RUNNING CUSTOMER CRM & WHATSAPP ACTION TESTS ===\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  // 1. Phone number formatting & normalization (+91, 10-digit, spaces, dashes)
  console.log("\n--- TEST SUITE 1: Phone Number Formatting ---");
  assert(formatWhatsAppPhone("9876543210") === "919876543210", "10-digit Indian number formats to 91XXXXXXXXXX");
  assert(formatWhatsAppPhone("+91 98765 43210") === "919876543210", "Number with +91 and spaces normalizes to 91XXXXXXXXXX");
  assert(formatWhatsAppPhone("098765-43210") === "919876543210", "Number with leading 0 and dashes normalizes to 91XXXXXXXXXX");
  assert(formatWhatsAppPhone("+919876543210") === "919876543210", "Number already with +91 normalizes to 91XXXXXXXXXX");
  assert(formatWhatsAppPhone("919876543210") === "919876543210", "12-digit number starting with 91 is preserved");
  assert(formatWhatsAppPhone("12345") === null, "Short invalid number returns null");
  assert(formatWhatsAppPhone("") === null, "Empty phone string returns null");

  // 2. WhatsApp message generation & URL safety
  console.log("\n--- TEST SUITE 2: WhatsApp Message & URL Generation ---");
  const b2bMsg = buildWhatsAppMessage({ contactName: "Rajesh Patel", customerType: "B2B" });
  const expectedUniversal =
    "Hi Rajesh Patel, this is Mahavir Card, Ahmedabad., sir ji aapne login kiya tha \n" +
    "Please feel free to share your requirement.,";
  assert(b2bMsg === expectedUniversal, "Universal message exact wording matches specification");

  const b2cMsg = buildWhatsAppMessage({ contactName: "Pooja Shah", customerType: "B2C" });
  assert(b2cMsg.includes("sir ji aapne login kiya tha"), "B2C gets universal 2-liner message");

  const fallbackMsg = buildWhatsAppMessage(null);
  assert(fallbackMsg.startsWith("Hi Customer, this is Mahavir Card"), "Fallback customer name handled smoothly");

  const waUrl = buildWhatsAppUrl("9876543210", b2bMsg);
  assert(waUrl !== null, "WhatsApp URL is generated for valid customer");
  if (waUrl) {
    assert(waUrl.startsWith("https://wa.me/919876543210?text="), "WhatsApp URL points to wa.me with normalized phone");
    assert(!waUrl.includes("id="), "WhatsApp URL does NOT leak internal/customer IDs");
    assert(!waUrl.includes("cust_"), "WhatsApp URL does NOT leak customer prefix");
    assert(decodeURIComponent(waUrl).includes("Hi Rajesh Patel"), "Decoded WhatsApp URL contains customer name");
    assert(decodeURIComponent(waUrl).includes("sir ji aapne login kiya tha"), "Decoded WhatsApp URL contains universal message");
  }

  // 3. Customer-Specific Price Catalogue Routing
  console.log("\n--- TEST SUITE 3: Customer-Specific Price Catalogue ---");
  assert(getCustomerCatalogueMode("B2B") === "B2B", "B2B customer mode is B2B");
  assert(getCustomerCatalogueMode("b2b") === "B2B", "Lowercase b2b customer mode is B2B");
  assert(getCustomerCatalogueMode("B2C") === "RETAIL", "B2C customer mode is RETAIL");
  assert(getCustomerCatalogueMode(undefined) === "RETAIL", "Undefined customer mode defaults to RETAIL");

  assert(getCustomerCatalogueUrl("B2B") === "/api/catalog/pdf?mode=B2B", "B2B gets official /api/catalog/pdf?mode=B2B");
  assert(getCustomerCatalogueUrl("B2C") === "/api/catalog/pdf?mode=RETAIL", "B2C gets official /api/catalog/pdf?mode=RETAIL");

  // 4. Lead Statuses & Validation
  console.log("\n--- TEST SUITE 4: Lead Statuses & Validation ---");
  const expectedStatuses = [
    "NEW LEAD",
    "CONTACTED",
    "TALKED ON CALL",
    "FOLLOW UP",
    "QUOTED",
    "CONVERTED",
    "LOST",
    "INACTIVE",
  ];
  assert(
    JSON.stringify(LEAD_STATUSES) === JSON.stringify(expectedStatuses),
    "All 8 specified lead statuses exist in correct order"
  );
  assert(isValidLeadStatus("TALKED ON CALL") === true, "isValidLeadStatus identifies 'TALKED ON CALL'");
  assert(isValidLeadStatus("INVALID_STATUS") === false, "isValidLeadStatus rejects invalid status");
  assert(isValidContactMethod("WHATSAPP") === true, "isValidContactMethod identifies 'WHATSAPP'");
  assert(isValidContactMethod("CALL") === true, "isValidContactMethod identifies 'CALL'");

  // 5. Database Schema & Persistence
  console.log("\n--- TEST SUITE 5: Database Persistence & Filtering ---");
  const allCustomers = await db.select().from(customers).limit(10);
  assert(allCustomers.length > 0, `Database has ${allCustomers.length} sample customers loaded`);

  // Verify existing customers have a safe default leadStatus
  const nullLeadStatusRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(customers)
    .where(sql`${customers.leadStatus} IS NULL`);
  const nullCount = nullLeadStatusRows[0]?.count ?? 0;
  assert(nullCount === 0, `Existing customers without status get 'NEW LEAD' safely (0 nulls found)`);

  const testCustomer = allCustomers[0];
  console.log(`Using test customer ID: ${testCustomer.id} (${testCustomer.contactName})`);

  // Test updating status directly
  const originalStatus = testCustomer.leadStatus;
  await db
    .update(customers)
    .set({
      leadStatus: "TALKED ON CALL",
      lastContactedAt: new Date(),
      lastContactMethod: "CALL",
    })
    .where(eq(customers.id, testCustomer.id));

  const [updatedCust] = await db.select().from(customers).where(eq(customers.id, testCustomer.id)).limit(1);
  assert(updatedCust.leadStatus === "TALKED ON CALL", "Status change to 'TALKED ON CALL' persists in DB");
  assert(updatedCust.lastContactMethod === "CALL", "Contact method 'CALL' persists in DB");
  assert(updatedCust.lastContactedAt !== null, "lastContactedAt timestamp persists in DB");

  // Revert back
  await db
    .update(customers)
    .set({
      leadStatus: originalStatus,
      lastContactedAt: testCustomer.lastContactedAt,
      lastContactMethod: testCustomer.lastContactMethod,
    })
    .where(eq(customers.id, testCustomer.id));

  const [revertedCust] = await db.select().from(customers).where(eq(customers.id, testCustomer.id)).limit(1);
  assert(revertedCust.leadStatus === originalStatus, `Reverted test customer status safely back to ${originalStatus}`);

  // Test filter queries
  const b2bList = await db.select().from(customers).where(eq(customers.customerType, "B2B")).limit(5);
  const b2cList = await db.select().from(customers).where(eq(customers.customerType, "B2C")).limit(5);
  console.log(`Filter results: ${b2bList.length} B2B sampled, ${b2cList.length} B2C sampled`);
  assert(b2bList.every((c) => c.customerType === "B2B"), "B2B filter returns only B2B records");
  assert(b2cList.every((c) => c.customerType === "B2C"), "B2C filter returns only B2C records");

  // Lead status filter
  const newLeads = await db.select().from(customers).where(eq(customers.leadStatus, "NEW LEAD")).limit(5);
  assert(newLeads.every((c) => c.leadStatus === "NEW LEAD"), "Lead status 'NEW LEAD' query filter works");

  // State filters
  const gjCustomers = await db.select().from(customers).where(eq(customers.stateCode, "GJ")).limit(5);
  assert(gjCustomers.every((c) => c.stateCode === "GJ"), "State 'GJ' filter returns only Gujarat customers");

  // Sorting by lastContactedAt
  const sortedByContact = await db
    .select({ id: customers.id, lastContactedAt: customers.lastContactedAt })
    .from(customers)
    .orderBy(sql`${customers.lastContactedAt} DESC NULLS LAST`)
    .limit(5);
  assert(Array.isArray(sortedByContact), "Query sorting by RECENTLY_CONTACTED executes successfully");

  // Check no private customer tokens or sensitive hashes exist in customer rows
  assert(!('password' in testCustomer), "Customer schema does not store plain or raw password");
  assert(!('token' in testCustomer), "Customer schema does not store access tokens");

  console.log(`\n========================================`);
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});
