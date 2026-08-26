import assert from "node:assert/strict";
import test from "node:test";

import { FilePolicyError, storageKeys, validateCdrMetadata, validateImageFile, validatePdfBytes } from "../src/lib/storage/index";

test("CDR metadata accepts an allowed file", () => {
  assert.doesNotThrow(() => validateCdrMetadata({ filename: "customer-card.cdr", contentType: "application/octet-stream", size: 1024, maximumMb: 100 }));
});

test("CDR metadata rejects PDF, PNG, and oversized files", () => {
  assert.throws(() => validateCdrMetadata({ filename: "artwork.pdf", contentType: "application/pdf", size: 1024, maximumMb: 100 }), FilePolicyError);
  assert.throws(() => validateCdrMetadata({ filename: "artwork.png", contentType: "image/png", size: 1024, maximumMb: 100 }), FilePolicyError);
  assert.throws(() => validateCdrMetadata({ filename: "artwork.cdr", contentType: "application/octet-stream", size: 2 * 1024 * 1024, maximumMb: 1 }), FilePolicyError);
});

test("image validation checks both MIME type and magic bytes", async () => {
  const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])], "image.png", { type: "image/png" });
  await assert.doesNotReject(() => validateImageFile(png));
  const disguised = new File(["not an image"], "image.png", { type: "image/png" });
  await assert.rejects(() => validateImageFile(disguised), FilePolicyError);
});

test("PDF byte validation rejects disguised documents", () => {
  assert.doesNotThrow(() => validatePdfBytes(new TextEncoder().encode("%PDF-1.7"), "invoice.pdf"));
  assert.throws(() => validatePdfBytes(new TextEncoder().encode("hello"), "invoice.pdf"), FilePolicyError);
});

test("object keys sanitize user filenames and cannot accept path traversal", () => {
  const key = storageKeys.productImage("product-id", "../../customer artwork.png");
  assert.match(key, /^products\/product-id\/images\/customer-artwork-[0-9a-f-]+\.png$/);
  assert.ok(!key.includes(".."));
});
