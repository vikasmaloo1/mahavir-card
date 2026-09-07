import { randomBytes, randomUUID } from "node:crypto";

const extensionPattern = /\.[a-z0-9]{1,12}$/i;

export function sanitizeFilename(value: string) {
  const leaf = value.split(/[\\/]/).pop() || "file";
  const normalized = leaf.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "");
  return (normalized || "file").slice(0, 160);
}

export function filenameExtension(value: string) {
  return sanitizeFilename(value).match(extensionPattern)?.[0].toLowerCase() ?? "";
}

function safeSegment(value: string, fallback = "item") {
  const segment = (value || "").trim().normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (segment || fallback).slice(0, 120);
}

export function uniqueFilename(originalFilename: string) {
  const safe = sanitizeFilename(originalFilename);
  const extension = filenameExtension(safe);
  const stem = (extension ? safe.slice(0, -extension.length) : safe).slice(0, 80).replace(/[._-]+$/g, "") || "file";
  return `${stem}-${randomUUID()}${extension}`;
}

export function objectKey(namespace: readonly string[], originalFilename: string) {
  if (!namespace.length) throw new Error("A storage namespace is required");
  return [...namespace.map((s) => safeSegment(s)), uniqueFilename(originalFilename)].join("/");
}

export const storageKeys = {
  productImage(productId: string, filename: string) { return objectKey(["products", productId, "images"], filename); },
  categoryImage(categoryId: string, filename: string) { return objectKey(["categories", categoryId, "images"], filename); },
  brandingLogo(filename: string) { return objectKey(["branding", "logo"], filename); },
  brandingAsset(filename: string) { return objectKey(["branding", "assets"], filename); },
  bannerImage(filename: string) { return objectKey(["banners", "images"], filename); },
  templateImage(templateId: string, filename: string) { return objectKey(["design-templates", templateId, "images"], filename); },
  templateSourceFile(templateId: string, filename: string) { return objectKey(["design-templates", templateId, "source"], filename); },
  artwork(customerFolder: string, productFolder: string, filename: string, slotKey?: string | null) {
    const safeCustomer = safeSegment(customerFolder, "customer");
    const safeProduct = safeSegment(productFolder, "product");
    const safeName = sanitizeFilename(filename);
    const ext = filenameExtension(safeName) || ".cdr";
    const stem = (ext ? safeName.slice(0, -ext.length) : safeName).slice(0, 50).replace(/[._-]+$/g, "") || "artwork";
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const slotPart = slotKey && slotKey.toUpperCase() !== "MAIN" ? `-${safeSegment(slotKey, "slot").toUpperCase()}` : "";
    const shortId = randomBytes(4).toString("hex");
    const cleanFilename = `${dateStr}${slotPart}-${stem}-${shortId}${ext}`;
    return ["artwork", safeCustomer, safeProduct, cleanFilename].join("/");
  },
  quote(quoteId: string, filename: string) { return objectKey(["quotes", quoteId], filename); },
  invoice(customerId: string, invoiceId: string, filename: string) { return objectKey(["invoices", customerId, invoiceId], filename); },
  document(entityType: string, entityId: string, filename: string) { return objectKey(["documents", entityType.toLowerCase(), entityId], filename); },
  paymentProof(userId: string, filename: string) { return objectKey(["payments", userId, "proofs"], filename); },
  qrCode(variant: string, filename: string) { return objectKey(["branding", "qr", variant.toLowerCase()], filename); },
};

export function safeContentDispositionFilename(value: string) {
  return sanitizeFilename(value).replace(/["\r\n]/g, "_");
}
