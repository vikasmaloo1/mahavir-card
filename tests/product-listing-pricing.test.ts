import assert from "node:assert/strict";
import test from "node:test";

import { conciseProductSpecification, deriveStartingPrice, type ListingPricingRule, type ListingProduct } from "../src/lib/product-listing-pricing";

const product: ListingProduct = { id: "product-1", orderable: true, quoteable: true, referenceQuantity: 1000, pricesTaxInclusive: true };
const rule = (amount: unknown, extra: Partial<ListingPricingRule> = {}): ListingPricingRule => ({
  productId: product.id,
  conditions: { quantity: 1000 },
  priceFormula: { amount, unit: "batch" },
  taxInclusive: true,
  isActive: true,
  ...extra,
});

test("returns the lowest valid active base price and its quantity", () => {
  const result = deriveStartingPrice(product, [rule("350"), rule("250"), rule("500")]);
  assert.equal(result.startingPrice, 250);
  assert.equal(result.startingQuantity, 1000);
  assert.equal(result.priceLabel, "Base price \u20b9250 / 1,000");
});

test("ignores disabled, hidden, internal, zero, and invalid rules while allowing GST-exclusive prices", () => {
  const result = deriveStartingPrice(product, [
    rule("100", { isActive: false }),
    rule("110", { conditions: { quantity: 1000, customerVisible: false } }),
    rule("120", { priceFormula: { amount: "120", internalOnly: true } }),
    rule("130", { conditions: { quantity: 1000, visibility: "INTERNAL" } }),
    rule("140", { taxInclusive: false }),
    rule("150", { variantId: "disabled-variant", variantActive: false }),
    rule("0"),
    rule(null),
    rule("300"),
  ]);
  assert.equal(result.startingPrice, 140);
});

test("converts a per-piece rule to the displayed reference-quantity total", () => {
  const result = deriveStartingPrice(product, [rule("0.5", { priceFormula: { amount: "0.5", unit: "piece" } })]);
  assert.equal(result.startingPrice, 500);
  assert.equal(result.priceLabel, "Base price \u20b9500 / 1,000");
});

test("quote-only and unpriced products never display zero", () => {
  assert.equal(deriveStartingPrice({ ...product, orderable: false }, [rule("250")]).priceLabel, "Custom quote");
  assert.equal(deriveStartingPrice({ ...product, quoteable: false }, []).priceLabel, "Contact us for pricing");
});

test("add-ons and delivery are not inputs to listing price derivation", () => {
  const result = deriveStartingPrice(product, [rule("250", { priceFormula: { amount: "250", unit: "batch", addonAmount: "100", deliveryAmount: "80" } })]);
  assert.equal(result.startingPrice, 250);
});

test("rounds customer-facing starting prices to whole rupees", () => {
  assert.equal(deriveStartingPrice(product, [rule("283.2")]).priceLabel, "Base price \u20b9283 / 1,000");
  assert.equal(deriveStartingPrice(product, [rule("283.8")]).priceLabel, "Base price \u20b9284 / 1,000");
});

test("shows sticker rates in paise without turning them into quote-only products", () => {
  const result = deriveStartingPrice({ ...product, quoteable: false }, [rule(null, { priceFormula: { ratePerSqInch: 0.33, ratePaisePerSqInch: 33 } })]);
  assert.equal(result.priceLabel, "33 paise / sq.in");
  assert.equal(result.startingPrice, 0.33);
});

test("removes repeated product names and reference quantities from listing copy", () => {
  assert.equal(conciseProductSpecification("NT Single", "NT Single for a reference batch of 1,000 cards.", "Visiting Card"), "Single-side visiting card printing.");
  assert.equal(conciseProductSpecification("NT Front Back", "NT Front Back for a reference batch of 1,000 cards.", "Visiting Card"), "Front-and-back visiting card printing.");
});
