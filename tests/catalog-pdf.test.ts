import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPriceView,
  CATALOG_PRICE_MODES,
  isCatalogPriceMode,
  resolveCatalogMode,
  stripPriceText,
  type CatalogPriceMode,
  type CatalogRate,
  type PricedProduct,
} from "../src/lib/catalog-pricing";
import { catalogCustomServices } from "../src/lib/catalog-custom-services";

/** Retail rules are stored tax-exclusive at 18%; trade rules tax-inclusive at 0%. */
const retailRate: CatalogRate = {
  ruleType: "FIXED_PER_REFERENCE_QUANTITY",
  amount: 480,
  ratePerSqInch: null,
  rateUnit: "RUPEES",
  referenceQuantity: 1000,
  bladeCharge: 50,
  minimumCharge: null,
  taxInclusive: false,
  taxRatePercent: 18,
};

const tradeRate: CatalogRate = {
  ...retailRate,
  amount: 520,
  taxInclusive: true,
  taxRatePercent: 0,
};

const areaRetail: CatalogRate = {
  ruleType: "PER_SQ_INCH",
  amount: null,
  ratePerSqInch: 33,
  rateUnit: "PAISE",
  referenceQuantity: 1000,
  bladeCharge: 50,
  minimumCharge: 250,
  taxInclusive: false,
  taxRatePercent: 18,
};

const batchProduct: PricedProduct = { retail: retailRate, trade: tradeRate };
const areaProduct: PricedProduct = { retail: areaRetail, trade: { ...areaRetail, ratePerSqInch: 35, taxInclusive: true, taxRatePercent: 0 } };

/** Any digit-bearing currency token, i.e. a real price rather than a size like "8.5 x 11 in". */
const MONEY = /(₹|\bRs\.?\s?\d|\bINR\s?\d|\d\s*(?:rupees|paise)\b)/i;

test("showroom price view exposes no monetary value at all", () => {
  for (const product of [batchProduct, areaProduct]) {
    const view = buildPriceView(product, "SHOWROOM");
    assert.equal(view.primary, null, "no headline price");
    assert.equal(view.primaryLabel, null);
    assert.equal(view.taxNote, null, "no GST wording, which would imply a price");
    assert.equal(view.minimumNote, null, "no minimum billing amount");
    assert.ok(view.enquiryNote, "an enquiry note replaces the price");
    // Every string the renderer can reach must be free of currency.
    const reachable = [view.batchLabel, view.enquiryNote, view.bladeNote].filter(Boolean).join(" ");
    assert.doesNotMatch(reachable, MONEY, `showroom leaked a price: ${reachable}`);
  }
});

test("each mode shows only its own segment's rate", () => {
  const trade = buildPriceView(batchProduct, "B2B");
  assert.match(trade.primary!, /520/);
  assert.match(trade.primaryLabel!, /trade/i);
  assert.doesNotMatch(trade.primary!, /480/, "trade must not reveal the retail rate");

  const retail = buildPriceView(batchProduct, "RETAIL");
  assert.match(retail.primary!, /480/);
  assert.match(retail.primaryLabel!, /retail/i);
  assert.doesNotMatch(retail.primary!, /520/, "retail must not reveal the trade rate");
});

test("GST wording follows the stored tax treatment", () => {
  // Retail rules are tax-exclusive, so the catalogue has to say GST is added.
  assert.equal(buildPriceView(batchProduct, "RETAIL").taxNote, "+ 18% GST applicable");
  // Trade rules are tax-inclusive at 0%, so no GST line may appear.
  assert.equal(buildPriceView(batchProduct, "B2B").taxNote, null);
  assert.equal(buildPriceView(batchProduct, "SHOWROOM").taxNote, null);
});

test("per-sq-inch products keep their unit, and area minimums surface only when priced", () => {
  assert.match(buildPriceView(areaProduct, "B2B").primary!, /35 paise \/ sq\.in/);
  assert.match(buildPriceView(areaProduct, "RETAIL").primary!, /33 paise \/ sq\.in/);
  assert.match(buildPriceView(areaProduct, "RETAIL").minimumNote!, /250/);
  assert.equal(buildPriceView(areaProduct, "SHOWROOM").minimumNote, null);
});

test("a missing segment rate degrades to an enquiry instead of showing the other segment", () => {
  const tradeOnly: PricedProduct = { retail: null, trade: tradeRate };
  const view = buildPriceView(tradeOnly, "RETAIL");
  assert.equal(view.primary, null);
  assert.match(view.enquiryNote!, /request/i);
  assert.doesNotMatch(view.enquiryNote!, MONEY);
});

test("stripPriceText removes embedded amounts but keeps the sentence useful", () => {
  assert.equal(stripPriceText("Square-inch pricing · minimum charge ₹250."), "Square-inch pricing.");
  assert.doesNotMatch(stripPriceText("Rate is Rs 1,250 per batch"), MONEY);
  assert.doesNotMatch(stripPriceText("Costs 33 paise per unit"), MONEY);
  // Sizes must survive: they are specifications, not prices.
  assert.match(stripPriceText("A4 sheet · 8.5 × 11.25 in"), /8\.5 × 11\.25 in/);
});

test("catalogue mode parsing rejects anything unexpected", () => {
  assert.deepEqual([...CATALOG_PRICE_MODES], ["RETAIL", "B2B", "SHOWROOM"]);
  for (const mode of CATALOG_PRICE_MODES) assert.equal(isCatalogPriceMode(mode), true);
  // RANGE was removed; it must not resolve any more.
  for (const bad of ["RANGE", "range", "", "ADMIN", null, undefined, 1]) assert.equal(isCatalogPriceMode(bad), false);
});

test("custom services are complete and carry no pricing in any mode", () => {
  assert.equal(catalogCustomServices.length, 8);
  const keys = new Set(catalogCustomServices.map((s) => s.key));
  assert.equal(keys.size, 8, "keys are unique so the icon map cannot collide");

  for (const service of catalogCustomServices) {
    assert.ok(service.title && service.subtitle && service.sizes && service.turnaround, `${service.key} is complete`);
    assert.equal(service.specs.length, 3, `${service.key} has its three spec lines`);
    assert.match(service.image, /^\/images\//, `${service.key} points at a local asset`);
    // These are quoted per specification, so no mode needs to suppress anything.
    const text = [service.title, service.subtitle, service.sizes, service.turnaround, ...service.specs].join(" ");
    assert.doesNotMatch(text, MONEY, `${service.key} must not carry a price`);
  }
});

test("mode narrowing never hands a viewer an edition they may not see", () => {
  const trade: CatalogPriceMode[] = ["B2B"];
  const retail: CatalogPriceMode[] = ["RETAIL"];
  const staff: CatalogPriceMode[] = ["RETAIL", "B2B", "SHOWROOM"];

  // A retail account cannot reach trade rates by editing the query string, and vice versa.
  assert.equal(resolveCatalogMode(retail, "RETAIL", "B2B"), "RETAIL");
  assert.equal(resolveCatalogMode(retail, "RETAIL", "SHOWROOM"), "RETAIL");
  assert.equal(resolveCatalogMode(trade, "B2B", "RETAIL"), "B2B");

  // Staff may switch between all three.
  for (const mode of staff) assert.equal(resolveCatalogMode(staff, "RETAIL", mode), mode);

  // Anything unrecognised — including the removed RANGE mode — falls back to the default.
  for (const bad of ["RANGE", "range", "", "ADMIN", null, undefined]) {
    assert.equal(resolveCatalogMode(staff, "RETAIL", bad as string | null), "RETAIL");
    assert.equal(resolveCatalogMode(trade, "B2B", bad as string | null), "B2B");
  }
});
