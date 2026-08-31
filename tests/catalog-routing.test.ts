import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogCategories,
  isLegacyCategorySlug,
  productFiltersToSearchParams,
  readProductFilters,
  resolveCategorySlug,
  safeProductReturnPath,
} from "../src/lib/catalog-routing";

test("defines exactly the seven canonical RATE catalogue slugs", () => {
  assert.deepEqual(catalogCategories.map(({ slug }) => slug), [
    "visiting-card", "premium-card", "art-card", "letterhead-envelope", "brochure", "leaflet-cover", "sticker",
  ]);
});

test("resolves legacy category links to their canonical categories", () => {
  assert.equal(resolveCategorySlug("business-cards"), "visiting-card");
  assert.equal(resolveCategorySlug("labels-stickers"), "sticker");
  assert.equal(isLegacyCategorySlug("business-cards"), true);
  assert.equal(isLegacyCategorySlug("visiting-card"), false);
});

test("initializes category, search, flags and page from a direct URL", () => {
  const params = new URLSearchParams("category=business-cards&search=NT&orderable=true&page=2");
  assert.deepEqual(readProductFilters(params), {
    category: "visiting-card", search: "NT", orderable: true, quoteable: false, page: 2,
  });
});

test("accepts legacy q searches but serializes one canonical search parameter", () => {
  const filters = readProductFilters(new URLSearchParams("category=sticker&q=lamination&quoteable=true"));
  assert.equal(productFiltersToSearchParams(filters).toString(), "category=sticker&search=lamination&quoteable=true");
});

test("only accepts local product-listing return paths", () => {
  assert.equal(safeProductReturnPath("/products?category=art-card&search=single"), "/products?category=art-card&search=single");
  assert.equal(safeProductReturnPath("https://example.com/products"), "/products");
  assert.equal(safeProductReturnPath("//example.com/products"), "/products");
});
