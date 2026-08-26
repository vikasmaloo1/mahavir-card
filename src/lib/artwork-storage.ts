import "server-only";

import { and, eq, isNotNull, isNull, lt } from "drizzle-orm";

import { resolveArtworkRequirement } from "@/lib/artwork-requirements";
import { db } from "@/lib/db/server";
import { artworks, customers, pricingRules, products } from "@/lib/db/schema";
import { storage, storageKeys, validateArtworkMetadata, validatePdfHeader } from "@/lib/storage";

export type InitiateArtworkInput = {
  productId: string;
  pricingRuleId?: string | null;
  filename: string;
  contentType?: string | null;
  fileSize: number;
  replaceArtworkId?: string | null;
  configuration?: Record<string, unknown>;
};

export function publicArtwork(artwork: typeof artworks.$inferSelect) {
  return {
    id: artwork.id,
    originalFileName: artwork.fileName,
    fileSize: artwork.fileSize,
    fileType: artwork.fileType,
    status: artwork.status,
    uploadedAt: artwork.createdAt.toISOString(),
    previewUrl: artwork.previewUrl,
    downloadUrl: artwork.status === "UPLOADING" ? null : `/api/artworks/${artwork.id}/download`,
  };
}

async function validatePricingRule(productId: string, pricingRuleId: string | null | undefined) {
  if (!pricingRuleId) return;
  const [rule] = await db.select({ id: pricingRules.id }).from(pricingRules).where(and(eq(pricingRules.id, pricingRuleId), eq(pricingRules.productId, productId), eq(pricingRules.isActive, true))).limit(1);
  if (!rule) throw new Error("The selected product configuration is not available.");
}

async function failArtworkUpload(artwork: typeof artworks.$inferSelect) {
  if (artwork.storageKey) await storage.deleteObject(artwork.storageKey).catch(() => undefined);
  await db.update(artworks).set({ status: "UPLOAD_FAILED", uploadExpiresAt: null, updatedAt: new Date() }).where(eq(artworks.id, artwork.id));
}

async function cleanupExpiredUploads(userId: string) {
  const expired = await db.select().from(artworks).where(and(eq(artworks.uploadedBy, userId), eq(artworks.status, "UPLOADING"), isNotNull(artworks.uploadExpiresAt), lt(artworks.uploadExpiresAt, new Date())));
  await Promise.all(expired.map((artwork) => failArtworkUpload(artwork)));
}

export async function initiateArtworkUpload(userId: string, input: InitiateArtworkInput) {
  await cleanupExpiredUploads(userId);
  const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
  if (!product) throw new Error("Product not found.");
  await validatePricingRule(input.productId, input.pricingRuleId);
  const requirement = await resolveArtworkRequirement(input.productId, input.pricingRuleId);
  if (!requirement) throw new Error("Artwork requirements have not been configured for this product configuration.");
  const format = validateArtworkMetadata({ filename: input.filename, contentType: input.contentType, size: input.fileSize, acceptedFormats: requirement.acceptedFormats, maximumMb: requirement.maxFileSize, minimumMb: requirement.minFileSize });

  let replacement: typeof artworks.$inferSelect | null = null;
  if (input.replaceArtworkId) {
    const [existing] = await db.select().from(artworks).where(and(eq(artworks.id, input.replaceArtworkId), eq(artworks.uploadedBy, userId), isNull(artworks.replacedAt))).limit(1);
    if (!existing || existing.productId !== input.productId || existing.pricingRuleId !== (input.pricingRuleId ?? null)) throw new Error("Artwork to replace was not found.");
    replacement = existing;
  } else {
    const existing = await db.select().from(artworks).where(and(eq(artworks.uploadedBy, userId), eq(artworks.productId, input.productId), input.pricingRuleId ? eq(artworks.pricingRuleId, input.pricingRuleId) : isNull(artworks.pricingRuleId), isNull(artworks.replacedAt)));
    const active = existing.filter((item) => item.status !== "UPLOAD_FAILED" && (item.status !== "UPLOADING" || !item.uploadExpiresAt || item.uploadExpiresAt > new Date()));
    if (active.length >= requirement.maxFiles) throw new Error(`This configuration accepts a maximum of ${requirement.maxFiles} artwork file${requirement.maxFiles === 1 ? "" : "s"}. Replace the existing file instead.`);
  }

  const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
  const artworkId = crypto.randomUUID();
  const contentType = input.contentType && input.contentType.trim() ? input.contentType.toLowerCase() : "application/octet-stream";
  const key = storageKeys.artwork(customer?.id ?? userId, input.productId, input.filename);
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const uploadUrl = await storage.getSignedUploadUrl({ key, contentType, expiresIn: 300 });
  const [artwork] = await db.insert(artworks).values({
    id: artworkId,
    customerId: customer?.id ?? null,
    productId: input.productId,
    pricingRuleId: input.pricingRuleId ?? null,
    configuration: input.configuration ?? {},
    fileName: input.filename,
    fileType: format.toLowerCase(),
    extension: `.${format.toLowerCase()}`,
    mimeType: contentType,
    fileSize: input.fileSize,
    uploadedBy: userId,
    storageKey: key,
    storageUrl: null,
    storageProvider: "R2",
    status: "UPLOADING",
    replacesArtworkId: replacement?.id ?? null,
    uploadExpiresAt: expiresAt,
  }).returning();
  if (!artwork) throw new Error("Artwork upload could not be started.");
  return { artwork: publicArtwork(artwork), uploadUrl, method: "PUT" as const, headers: { "Content-Type": contentType }, expiresAt: expiresAt.toISOString() };
}

export async function finalizeArtworkUpload(userId: string, artworkId: string) {
  const [artwork] = await db.select().from(artworks).where(and(eq(artworks.id, artworkId), eq(artworks.uploadedBy, userId))).limit(1);
  if (!artwork || !artwork.storageKey) throw new Error("Artwork upload was not found.");
  if (artwork.status !== "UPLOADING") return publicArtwork(artwork);
  if (artwork.uploadExpiresAt && artwork.uploadExpiresAt < new Date()) { await failArtworkUpload(artwork); throw new Error("The upload session expired. Please choose the file again."); }
  const head = await storage.headObject(artwork.storageKey);
  if (!head) { await failArtworkUpload(artwork); throw new Error("The uploaded object was not found in storage."); }
  try {
    const requirement = artwork.productId ? await resolveArtworkRequirement(artwork.productId, artwork.pricingRuleId) : null;
    if (!requirement) throw new Error("Artwork requirements are no longer available.");
    const format = validateArtworkMetadata({ filename: artwork.fileName, contentType: head.contentType, size: head.contentLength, acceptedFormats: requirement.acceptedFormats, maximumMb: requirement.maxFileSize, minimumMb: requirement.minFileSize });
    if (format === "PDF") validatePdfHeader(await storage.getObjectPrefix(artwork.storageKey, 5));
    if (head.contentLength !== artwork.fileSize) throw new Error("The uploaded file size does not match the approved upload.");
  } catch (error) {
    await failArtworkUpload(artwork);
    throw error;
  }

  const completed = await db.transaction(async (tx) => {
    const [updated] = await tx.update(artworks).set({ status: "PENDING_REVIEW", fileSize: head.contentLength, mimeType: head.contentType || artwork.mimeType, etag: head.etag, uploadExpiresAt: null, updatedAt: new Date() }).where(eq(artworks.id, artwork.id)).returning();
    if (artwork.replacesArtworkId) await tx.update(artworks).set({ replacedAt: new Date(), updatedAt: new Date() }).where(and(eq(artworks.id, artwork.replacesArtworkId), eq(artworks.uploadedBy, userId)));
    return updated;
  });
  if (!completed) throw new Error("Artwork metadata could not be finalized.");

  if (artwork.replacesArtworkId) {
    const [oldArtwork] = await db.select({ storageKey: artworks.storageKey }).from(artworks).where(eq(artworks.id, artwork.replacesArtworkId)).limit(1);
    if (oldArtwork?.storageKey) await storage.deleteObject(oldArtwork.storageKey).catch((error) => console.error("R2 cleanup failed after artwork replacement", { artworkId: artwork.replacesArtworkId, error }));
  }
  return publicArtwork(completed);
}
