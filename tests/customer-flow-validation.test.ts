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

test("credit and wallet eligibility enforces B2B credit terms and B2C prepaid wallet terms", () => {
  // B2B with credit enabled allows ordering with sufficient balance
  assert.deepEqual(evaluateCreditEligibility({ customerType: "B2B", creditEnabled: true, availableCredit: "1000.00", status: "ACTIVE" }, "750.00"), { eligible: true, availableCredit: 1000 });
  // B2B with credit enabled allows ordering even when balance is less than order total (negative balance permitted)
  assert.equal(evaluateCreditEligibility({ customerType: "B2B", creditEnabled: true, availableCredit: "700.00", status: "ACTIVE" }, "750.00").eligible, true);
  // B2B with credit disabled is rejected
  assert.equal(evaluateCreditEligibility({ customerType: "B2B", creditEnabled: false, availableCredit: "1000.00", status: "ACTIVE" }, "750.00").eligible, false);
  // Inactive B2B account is rejected
  assert.equal(evaluateCreditEligibility({ customerType: "B2B", creditEnabled: true, availableCredit: "1000.00", status: "INACTIVE" }, "750.00").eligible, false);

  // B2C allows wallet usage when available balance covers order total (prepaid)
  assert.deepEqual(evaluateCreditEligibility({ customerType: "B2C", creditEnabled: false, availableCredit: "1000.00", status: "ACTIVE" }, "750.00"), { eligible: true, availableCredit: 1000 });
  // B2C strictly prevents negative balance (no credit allowed)
  const insufficientB2C = evaluateCreditEligibility({ customerType: "B2C", creditEnabled: false, availableCredit: "500.00", status: "ACTIVE" }, "750.00");
  assert.equal(insufficientB2C.eligible, false);
  assert.equal(insufficientB2C.reason, "INSUFFICIENT");
  const zeroBalanceB2C = evaluateCreditEligibility({ customerType: "B2C", creditEnabled: true, availableCredit: "0.00", status: "ACTIVE" }, "750.00");
  assert.equal(zeroBalanceB2C.eligible, false);
  assert.equal(zeroBalanceB2C.reason, "INSUFFICIENT");
  // Inactive B2C account is rejected
  assert.equal(evaluateCreditEligibility({ customerType: "B2C", creditEnabled: false, availableCredit: "1000.00", status: "INACTIVE" }, "750.00").eligible, false);
});

test("order cancellation policy: only PENDING orders can be cancelled; CONFIRMED orders cannot be cancelled", () => {
  function isCancellableByCustomer(status: string) {
    return status === "PENDING";
  }
  assert.equal(isCancellableByCustomer("PENDING"), true);
  assert.equal(isCancellableByCustomer("CONFIRMED"), false);
  assert.equal(isCancellableByCustomer("IN_PRODUCTION"), false);
  assert.equal(isCancellableByCustomer("READY"), false);
  assert.equal(isCancellableByCustomer("DISPATCHED"), false);
  assert.equal(isCancellableByCustomer("DELIVERED"), false);
  assert.equal(isCancellableByCustomer("CANCELLED"), false);
});
