import assert from "node:assert/strict";
import test from "node:test";

import { buildListItem, buildProductOffer, isValidProductNode } from "../src/lib/product-schema";

const product = {
  name: "A4 130 GSM Art Paper Single Side",
  slug: "leaflet-a4-130-gsm-single-side",
  imageUrl: "/images/products/leaflet.jpg",
  specification: "A4 leaflet, 130 GSM art paper",
  categoryName: "Leaflet",
};

test("no price means no Offer", () => {
  for (const absent of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(buildProductOffer(product.slug, absent as number | null), null, `${absent} must not produce an offer`);
  }
});

test("a real price produces a complete Offer", () => {
  const offer = buildProductOffer(product.slug, 1700)!;
  assert.equal(offer["@type"], "Offer");
  assert.equal(offer.price, "1700.00");
  assert.equal(offer.priceCurrency, "INR");
  assert.match(offer.url, /^https:\/\/mahavircard\.in\/catalog\//);
  assert.ok(offer.availability && offer.seller);
  assert.equal(offer.priceValidUntil, undefined, "only set when asked for");
  assert.equal(buildProductOffer(product.slug, 1700, { priceValidUntil: "2027-12-31" })!.priceValidUntil, "2027-12-31");
});

test("a Product node is only emitted when an offer backs it", () => {
  // This is the Search Console failure: a Product with no offers/review/aggregateRating.
  const anonymous = buildListItem(product, 1, null) as Record<string, unknown>;
  assert.equal(anonymous["@type"], "ListItem");
  assert.equal(anonymous.item, undefined, "no Product node without a price");
  assert.equal(anonymous.name, product.name, "the item is still named");
  assert.ok(String(anonymous.url).endsWith(product.slug), "and still linked");

  const priced = buildListItem(product, 2, buildProductOffer(product.slug, 1700)) as {
    item: Record<string, unknown>;
  };
  assert.equal(priced.item["@type"], "Product");
  assert.ok(priced.item.offers, "a published Product always carries offers");
  assert.equal(priced.item.sku, product.slug);
});

test("every Product node we build satisfies Google's requirement", () => {
  for (const price of [null, 1700]) {
    const entry = buildListItem(product, 1, buildProductOffer(product.slug, price)) as { item?: Record<string, unknown> };
    if (entry.item) assert.equal(isValidProductNode(entry.item), true);
  }
  // The guard itself must actually reject the invalid shape.
  assert.equal(isValidProductNode({ "@type": "Product", name: "x" }), false);
  assert.equal(isValidProductNode({ "@type": "Product", name: "x", aggregateRating: {} }), true);
  assert.equal(isValidProductNode({ "@type": "BreadcrumbList" }), true, "non-Products are unaffected");
});
