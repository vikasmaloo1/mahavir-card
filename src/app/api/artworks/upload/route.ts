import { and, eq, isNull } from "drizzle-orm";

import { resolveArtworkRequirement } from "@/lib/artwork-requirements";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, products } from "@/lib/db/schema";
import { getSession } from "@/lib/permissions";
import { ArtworkStorageUnavailableError, artworkStorage } from "@/lib/storage";

const validMimeTypes = new Set(["", "application/octet-stream", "application/cdr", "application/vnd.corel-draw", "application/x-cdr"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function formString(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) return jsonError("Authentication required", 401);
    const form = await request.formData();
    const file = form.get("file");
    const productId = formString(form, "productId");
    const pricingRuleId = formString(form, "pricingRuleId") || undefined;
    const replaceArtworkId = formString(form, "replaceArtworkId") || undefined;
    const rawConfiguration = formString(form, "configuration");
    if (!(file instanceof File) || !productId || !uuidPattern.test(productId)) return jsonError("A product and CDR file are required", 422);
    if (!file.name.toLowerCase().endsWith(".cdr") || !validMimeTypes.has(file.type.toLowerCase())) return jsonError("Only CorelDRAW (.cdr) files are accepted.", 422);
    const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, productId), eq(products.isActive, true))).limit(1);
    if (!product) return jsonError("Product not found", 404);
    const requirement = await resolveArtworkRequirement(productId, pricingRuleId);
    if (!requirement) return jsonError("Artwork requirements have not been configured for this product configuration.", 422);
    if (requirement.minFileSize && file.size < requirement.minFileSize) return jsonError("File is smaller than the configured minimum size.", 422);
    if (requirement.maxFileSize && file.size > requirement.maxFileSize) return jsonError(`File exceeds the ${Math.ceil(requirement.maxFileSize / 1_000_000)} MB limit.`, 422);
    let configuration: Record<string, unknown> = {};
    if (rawConfiguration) { try { configuration = JSON.parse(rawConfiguration) as Record<string, unknown>; } catch { return jsonError("Artwork configuration is invalid", 422); } }

    let currentArtwork: typeof artworks.$inferSelect | undefined;
    if (replaceArtworkId) {
      const [existing] = await db.select().from(artworks).where(and(eq(artworks.id, replaceArtworkId), eq(artworks.uploadedBy, session.user.id))).limit(1);
      if (!existing) return jsonError("Artwork to replace was not found", 404);
      currentArtwork = existing;
    } else {
      const existing = await db.select({ id: artworks.id }).from(artworks).where(and(eq(artworks.uploadedBy, session.user.id), eq(artworks.productId, productId), pricingRuleId ? eq(artworks.pricingRuleId, pricingRuleId) : isNull(artworks.pricingRuleId), isNull(artworks.replacedAt))).limit(requirement.maxFiles);
      if (existing.length >= requirement.maxFiles) return jsonError(`This configuration accepts a maximum of ${requirement.maxFiles} artwork file${requirement.maxFiles === 1 ? "" : "s"}. Replace the existing file instead.`, 422);
    }

    const stored = await artworkStorage.upload({ file, productId });
    const values = { productId, pricingRuleId: pricingRuleId ?? null, configuration, fileName: file.name, fileType: "cdr", extension: ".cdr", mimeType: file.type || "application/octet-stream", fileSize: file.size, storageKey: stored.key, storageUrl: stored.url, previewUrl: null, status: "PENDING_REVIEW", uploadedBy: session.user.id, replacedAt: null, updatedAt: new Date() };
    const artwork = currentArtwork ? (await db.update(artworks).set(values).where(eq(artworks.id, currentArtwork.id)).returning())[0] : (await db.insert(artworks).values(values).returning())[0];
    if (currentArtwork?.storageUrl && currentArtwork.storageUrl !== stored.url) await artworkStorage.remove(currentArtwork.storageUrl).catch(() => undefined);
    return artwork ? jsonOk(artwork, currentArtwork ? 200 : 201) : jsonError("Artwork was not saved", 500);
  } catch (error) {
    if (error instanceof ArtworkStorageUnavailableError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
