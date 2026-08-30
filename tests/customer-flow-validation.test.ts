import assert from "node:assert/strict";
import test from "node:test";

import { cartItemUpdateSchema, checkoutSchema } from "../src/lib/validation";
import { evaluateCreditEligibility } from "../src/lib/customer-credit";

test("quantity-only basket updates preserve the stored configuration", () => {
  const parsed = cartItemUpdateSchema.parse({ quantity: 1000 });
  assert.equal("configuration" in parsed, false);
});

test("checkout validates a complete delivery address while accepting the legacy items field", () => {
  const parsed = checkoutSchema.parse({
    customer: { contactName: "Vikas", companyName: "Mahavir Card", phone: "9426371150" },
    address: { line1: "Khadia Golwad", city: "Ahmedabad", state: "Gujarat", stateCode: "GJ", postalCode: "380001", country: "India" },
    paymentMethod: "COD",
    items: [{ productId: crypto.randomUUID(), quantity: 1, configuration: { amount: "0.01" } }],
  });
  assert.equal(parsed.address.postalCode, "380001");
  assert.equal(parsed.paymentMethod, "COD");
});

test("checkout accepts a direct customer-credit order", () => {
  const parsed = checkoutSchema.parse({
    customer: { contactName: "Vikas", companyName: "Mahavir Card", phone: "9426371150" },
    address: { line1: "Khadia Golwad", city: "Ahmedabad", state: "Gujarat", stateCode: "GJ", postalCode: "380001", country: "India" },
    paymentMethod: "CREDIT",
  });
  assert.equal(parsed.paymentMethod, "CREDIT");
});

test("credit eligibility requires an active B2B account with enough enabled credit", () => {
  assert.deepEqual(evaluateCreditEligibility({ customerType: "B2B", creditEnabled: true, availableCredit: "1000.00", status: "ACTIVE" }, "750.00"), { eligible: true, availableCredit: 1000 });
  assert.equal(evaluateCreditEligibility({ customerType: "B2C", creditEnabled: true, availableCredit: "1000.00", status: "ACTIVE" }, "750.00").eligible, false);
  assert.equal(evaluateCreditEligibility({ customerType: "B2B", creditEnabled: true, availableCredit: "700.00", status: "ACTIVE" }, "750.00").eligible, false);
  assert.equal(evaluateCreditEligibility({ customerType: "B2B", creditEnabled: false, availableCredit: "1000.00", status: "ACTIVE" }, "750.00").eligible, false);
});
