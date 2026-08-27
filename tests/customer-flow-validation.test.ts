import assert from "node:assert/strict";
import test from "node:test";

import { cartItemUpdateSchema, checkoutSchema } from "../src/lib/validation";

test("quantity-only basket updates preserve the stored configuration", () => {
  const parsed = cartItemUpdateSchema.parse({ quantity: 1000 });
  assert.equal("configuration" in parsed, false);
});

test("checkout validates a complete delivery address while accepting the legacy items field", () => {
  const parsed = checkoutSchema.parse({
    customer: { contactName: "Vikas", companyName: "Mahavir Card", phone: "9426371150" },
    address: { line1: "Khadia Golwad", city: "Ahmedabad", state: "Gujarat", postalCode: "380001", country: "India" },
    paymentMethod: "COD",
    items: [{ productId: crypto.randomUUID(), quantity: 1, configuration: { amount: "0.01" } }],
  });
  assert.equal(parsed.address.postalCode, "380001");
  assert.equal(parsed.paymentMethod, "COD");
});
