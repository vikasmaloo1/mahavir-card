import assert from "node:assert/strict";
import test from "node:test";

import { isQuoteExpired } from "../src/lib/quote-conversion";
import { groupFrequentProducts, type OrderedProductRow } from "../src/lib/frequent-products";
import { pickReusableArtworkPerSlot } from "../src/lib/artwork-reuse";

test("a quote with no validUntil never expires", () => {
  assert.equal(isQuoteExpired({ validUntil: null }), false);
});

test("a quote expires once validUntil has passed", () => {
  assert.equal(isQuoteExpired({ validUntil: new Date(Date.now() - 1000) }), true);
  assert.equal(isQuoteExpired({ validUntil: new Date(Date.now() + 60_000) }), false);
});

function row(overrides: Partial<OrderedProductRow>): OrderedProductRow {
  return {
    productId: "p1",
    quantity: 1000,
    configuration: {},
    productName: "Test Product",
    productSlug: "test-product",
    productImageUrl: null,
    productOrderable: true,
    productIsActive: true,
    productStatus: "ACTIVE",
    ...overrides,
  };
}

test("frequent products requires more than one order and sorts by count", () => {
  const rows = [
    row({ productId: "a" }),
    row({ productId: "a" }),
    row({ productId: "a" }),
    row({ productId: "b" }),
    row({ productId: "b" }),
    row({ productId: "c" }), // ordered once — never "frequent"
  ];
  const frequent = groupFrequentProducts(rows);
  assert.deepEqual(frequent.map((item) => item.productId), ["a", "b"]);
  assert.equal(frequent[0].orderCount, 3);
});

test("frequent products excludes inactive, disabled, and non-orderable products", () => {
  const rows = [
    row({ productId: "inactive", productIsActive: false }),
    row({ productId: "inactive", productIsActive: false }),
    row({ productId: "disabled", productStatus: "DISABLED" }),
    row({ productId: "disabled", productStatus: "DISABLED" }),
    row({ productId: "quote-only", productOrderable: false }),
    row({ productId: "quote-only", productOrderable: false }),
  ];
  assert.deepEqual(groupFrequentProducts(rows), []);
});

test("frequent products respects the limit", () => {
  const rows = ["a", "b", "c", "d"].flatMap((id) => [row({ productId: id }), row({ productId: id })]);
  assert.equal(groupFrequentProducts(rows, 2).length, 2);
});

test("reusable artwork picks one candidate per slot, most-recent first", () => {
  const rows = [
    { id: "new-main", fileName: "v2.cdr", artworkSlotKey: "MAIN", createdAt: new Date("2026-01-02") },
    { id: "old-main", fileName: "v1.cdr", artworkSlotKey: "MAIN", createdAt: new Date("2026-01-01") },
    { id: "back", fileName: "back.cdr", artworkSlotKey: "BACK", createdAt: new Date("2026-01-01") },
  ];
  const candidates = pickReusableArtworkPerSlot(rows);
  assert.equal(candidates.length, 2);
  assert.equal(candidates.find((c) => c.slotKey === "MAIN")?.id, "new-main");
  assert.equal(candidates.find((c) => c.slotKey === "BACK")?.id, "back");
});

test("reusable artwork returns nothing when there are no rows", () => {
  assert.deepEqual(pickReusableArtworkPerSlot([]), []);
});
