import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { brandingAssets } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage, storageKeys, validateImageFile } from "@/lib/storage";

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const assets = await db.select({ id: brandingAssets.id, assetKey: brandingAssets.assetKey, assetType: brandingAssets.assetType, imageUrl: brandingAssets.imageUrl, originalFilename: brandingAssets.originalFilename, contentType: brandingAssets.contentType, fileSize: brandingAssets.fileSize, altText: brandingAssets.altText, isPublic: brandingAssets.isPublic, isActive: brandingAssets.isActive, createdAt: brandingAssets.createdAt }).from(brandingAssets).orderBy(asc(brandingAssets.createdAt));
    return jsonOk(assets);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  let newKey: string | null = null;
  try {
    await requireRole(request, ["ADMIN"]);
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return jsonError("An image file is required", 422);
    await validateImageFile(file);
    const assetKey = text(form, "assetKey"); const assetType = text(form, "assetType") === "LOGO" ? "LOGO" : "ASSET";
    if (!/^[a-z0-9][a-z0-9._-]{1,79}$/i.test(assetKey)) return jsonError("Asset key must use letters, numbers, dots, dashes, or underscores", 422);
    const [existing] = await db.select().from(brandingAssets).where(eq(brandingAssets.assetKey, assetKey)).limit(1);
    newKey = assetType === "LOGO" ? storageKeys.brandingLogo(file.name) : storageKeys.brandingAsset(file.name);
    await storage.uploadObject({ key: newKey, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type, contentLength: file.size, visibility: text(form, "isPublic") === "false" ? "PRIVATE" : "PUBLIC", metadata: { resource: "branding", assetKey } });
    const imageUrl = `/api/branding/assets/${encodeURIComponent(assetKey)}/file`;
    const values = { assetKey, assetType, storageKey: newKey, imageUrl, originalFilename: file.name, contentType: file.type, fileSize: file.size, altText: text(form, "altText") || null, isPublic: text(form, "isPublic") !== "false", isActive: true, updatedAt: new Date() };
    const [asset] = existing ? await db.update(brandingAssets).set(values).where(eq(brandingAssets.id, existing.id)).returning() : await db.insert(brandingAssets).values(values).returning();
    if (!asset) throw new Error("Branding asset metadata was not saved");
    if (existing?.storageKey && existing.storageKey !== newKey) await storage.deleteObject(existing.storageKey).catch((error) => console.error("R2 branding cleanup failed", { assetId: existing.id, error }));
    return jsonOk(asset, existing ? 200 : 201);
  } catch (error) {
    if (newKey) await storage.deleteObject(newKey).catch(() => undefined);
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
