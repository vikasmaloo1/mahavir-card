import assert from "node:assert/strict";
import test from "node:test";

import { FilePolicyError, storageKeys, validateArtworkMetadata, validateCdrMetadata, validateImageFile, validatePdfBytes, validatePdfHeader } from "../src/lib/storage/index";
import { artworkRequirementSchema } from "../src/lib/validation";

test("CDR metadata accepts an allowed file", () => {
  assert.doesNotThrow(() => validateCdrMetadata({ filename: "customer-card.cdr", contentType: "application/octet-stream", size: 1024, maximumMb: 100 }));
});

test("CDR metadata rejects PDF, PNG, and oversized files", () => {
  assert.throws(() => validateCdrMetadata({ filename: "artwork.pdf", contentType: "application/pdf", size: 1024, maximumMb: 100 }), FilePolicyError);
  assert.throws(() => validateCdrMetadata({ filename: "artwork.png", contentType: "image/png", size: 1024, maximumMb: 100 }), FilePolicyError);
  assert.throws(() => validateCdrMetadata({ filename: "artwork.cdr", contentType: "application/octet-stream", size: 2 * 1024 * 1024, maximumMb: 1 }), FilePolicyError);
});

test("admin-configured artwork formats accept PDF or CDR and reject unconfigured types", () => {
  assert.equal(validateArtworkMetadata({ filename: "visiting-card.pdf", contentType: "application/pdf", size: 2048, acceptedFormats: ["PDF", "CDR"], maximumMb: 100 }), "PDF");
  assert.equal(validateArtworkMetadata({ filename: "visiting-card.cdr", contentType: "application/octet-stream", size: 2048, acceptedFormats: ["PDF", "CDR"], maximumMb: 100 }), "CDR");
  assert.throws(() => validateArtworkMetadata({ filename: "visiting-card.pdf", contentType: "application/pdf", size: 2048, acceptedFormats: ["CDR"], maximumMb: 100 }), FilePolicyError);
  assert.throws(() => validateArtworkMetadata({ filename: "visiting-card.png", contentType: "image/png", size: 2048, acceptedFormats: ["PDF", "CDR"], maximumMb: 100 }), FilePolicyError);
});

test("PDF artwork must contain a genuine PDF header", () => {
  assert.doesNotThrow(() => validatePdfHeader(new TextEncoder().encode("%PDF-1.7")));
  assert.throws(() => validatePdfHeader(new TextEncoder().encode("not-pdf")), FilePolicyError);
});

test("admin artwork rules accept CDR dimensions and named artwork instructions", () => {
  const rule = artworkRequirementSchema.parse({
    artworkRequired: true,
    acceptedFormats: ["CDR"],
    maxFileSize: 100,
    maxFiles: 1,
    designWidth: "93",
    designHeight: "56",
    designUnit: "mm",
    safeAreaWidth: "82",
    safeAreaHeight: "45",
    finalWidth: "90",
    finalHeight: "53",
    pageInstructions: [
      { pageNumber: 1, label: "Design File", required: true },
      { pageNumber: 2, label: "Spot UV File", colorMode: "B&W only", required: false },
      { pageNumber: 3, label: "Foil File", colorMode: "B&W only", required: false },
    ],
    multiplePageInstructions: "Upload each named production separation in its matching CDR slot.",
  });

  assert.deepEqual(rule.acceptedFormats, ["CDR"]);
  assert.equal(rule.pageInstructions[1]?.colorMode, "B&W only");
  assert.equal(rule.finalWidth, "90");
});

test("admin artwork rules reject empty and unsupported format lists", () => {
  assert.throws(() => artworkRequirementSchema.parse({ acceptedFormats: [] }));
  assert.throws(() => artworkRequirementSchema.parse({ acceptedFormats: ["AI"] }));
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
