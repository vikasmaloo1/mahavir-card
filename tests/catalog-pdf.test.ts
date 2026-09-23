import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPriceView,
  CATALOG_PRICE_MODES,
  isCatalogPriceMode,
  stripPriceText,
  type PricedProduct,
} from "../src/lib/catalog-pricing";
import { rateCatalog } from "../src/lib/rate-catalog";

const batchProduct: PricedProduct = {
  ruleType: "FIXED_PER_REFERENCE_QUANTITY",
  amount: 240,
  b2bAmount: 270,
  referenceQuantity: 1000,
  bladeCharge: 50,
};

const areaProduct: PricedProduct = {
  ruleType: "PER_SQ_INCH",
  ratePerSqInch: 33,
  b2bRatePerSqInch: 37,
  rateUnit: "PAISE",
  referenceQuantity: 1000,
};

/** Any digit-bearing currency token, i.e. a real price rather than a size like "8.5 x 11 in". */
const MONEY = /(₹|\bRs\.?\s?\d|\bINR\s?\d|\d\s*(?:rupees|paise)\b)/i;

test("showroom price view exposes no monetary value at all", () => {
  for (const product of [batchProduct, areaProduct]) {
    const view = buildPriceView(product, "SHOWROOM");
    assert.equal(view.primary, null, "no headline price");
    assert.equal(view.primaryLabel, null);
    assert.deepEqual(view.breakdown, [], "no trade/retail breakdown");
    assert.ok(view.enquiryNote, "an enquiry note replaces the price");
    // Every string the renderer can reach must be free of currency.
    const reachable = [view.batchLabel, view.enquiryNote, view.bladeNote].filter(Boolean).join(" ");
    assert.doesNotMatch(reachable, MONEY, `showroom leaked a price: ${reachable}`);
  }
});

test("priced modes emphasise the right rate", () => {
  assert.match(buildPriceView(batchProduct, "B2B").primary!, /270/);
  assert.match(buildPriceView(batchProduct, "B2B").primaryLabel!, /trade/i);
  assert.match(buildPriceView(batchProduct, "RETAIL").primary!, /240/);
  assert.match(buildPriceView(batchProduct, "RETAIL").primaryLabel!, /retail/i);

  const range = buildPriceView(batchProduct, "RANGE");
  assert.match(range.primary!, /240/);
  assert.match(range.primary!, /270/);
  assert.equal(range.breakdown.length, 2, "range shows both trade and retail");
});

test("per-sq-inch products keep their unit in priced modes", () => {
  assert.match(buildPriceView(areaProduct, "B2B").primary!, /37 paise \/ sq\.in/);
  assert.match(buildPriceView(areaProduct, "RETAIL").primary!, /33 paise \/ sq\.in/);
});

test("stripPriceText removes embedded amounts but keeps the sentence useful", () => {
  assert.equal(stripPriceText("Square-inch pricing · minimum charge ₹250."), "Square-inch pricing.");
  assert.doesNotMatch(stripPriceText("Rate is Rs 1,250 per batch"), MONEY);
  assert.doesNotMatch(stripPriceText("Costs 33 paise per unit"), MONEY);
  // Sizes must survive: they are specifications, not prices.
  assert.match(stripPriceText("A4 sheet · 8.5 × 11.25 in"), /8\.5 × 11\.25 in/);
});

test("no catalogue description leaks a price once sanitised for showroom", () => {
  let checked = 0;
  for (const category of rateCatalog) {
    for (const item of category.items) {
      if (!item.shortDescription) continue;
      checked++;
      assert.doesNotMatch(
        stripPriceText(item.shortDescription),
        MONEY,
        `${item.slug} still exposes a price in showroom mode`,
      );
    }
  }
  assert.ok(checked > 30, "every catalogue product description was checked");
});

test("catalogue mode parsing rejects anything unexpected", () => {
  for (const mode of CATALOG_PRICE_MODES) assert.equal(isCatalogPriceMode(mode), true);
  for (const bad of ["range", "", "ADMIN", null, undefined, 1]) assert.equal(isCatalogPriceMode(bad), false);
});
