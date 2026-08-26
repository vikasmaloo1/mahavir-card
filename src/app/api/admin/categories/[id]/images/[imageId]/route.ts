import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categoryImages } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage, storageKeys, validateImageFile } from "@/lib/storage";

const metadataSchema = z.object({ altText: z.string().trim().max(300).nullable().optional(), sortOrder: z.coerce.number().int().min(0).optional(), isPrimary: z.boolean().optional() });
function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/categories/[id]/images/[imageId]">) {
  let newKey: string | null = null;
  try {
    await requireRole(request, ["ADMIN"]); const { id: categoryId, imageId } = await ctx.params;
    const [existing] = await db.select().from(categoryImages).where(and(eq(categoryImages.id, imageId), eq(categoryImages.categoryId, categoryId))).limit(1);
    if (!existing) return jsonError("Category image not found", 404);
    const type = request.headers.get("content-type") ?? ""; let input: z.infer<typeof metadataSchema> = {}; let replacement: File | null = null;
    if (type.includes("multipart/form-data")) { const form = await request.formData(); const candidate = form.get("file"); replacement = candidate instanceof File && candidate.size ? candidate : null; input = metadataSchema.parse({ altText: text(form, "altText") || null, sortOrder: text(form, "sortOrder") || existing.sortOrder, isPrimary: text(form, "isPrimary") ? text(form, "isPrimary") === "true" : existing.isPrimary }); } else input = metadataSchema.parse(await request.json());
    if (replacement) { await validateImageFile(replacement); newKey = storageKeys.categoryImage(categoryId, replacement.name); await storage.uploadObject({ key: newKey, body: new Uint8Array(await replacement.arrayBuffer()), contentType: replacement.type, contentLength: replacement.size, visibility: "PUBLIC", metadata: { resource: "category-image", categoryId } }); }
    const [updated] = await db.transaction(async (tx) => { if (input.isPrimary) await tx.update(categoryImages).set({ isPrimary: false, updatedAt: new Date() }).where(eq(categoryImages.categoryId, categoryId)); return tx.update(categoryImages).set({ ...input, ...(replacement && newKey ? { storageKey: newKey, originalFilename: replacement.name, contentType: replacement.type, fileSize: replacement.size } : {}), updatedAt: new Date() }).where(and(eq(categoryImages.id, imageId), eq(categoryImages.categoryId, categoryId))).returning(); });
    if (replacement && existing.storageKey !== newKey) await storage.deleteObject(existing.storageKey).catch((error) => console.error("R2 category image cleanup failed", { imageId, error }));
    return updated ? jsonOk(updated) : jsonError("Category image not found", 404);
  } catch (error) {
    if (newKey) await storage.deleteObject(newKey).catch(() => undefined);
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError || error instanceof z.ZodError) return jsonError(error instanceof Error ? error.message : "Invalid image metadata", 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/categories/[id]/images/[imageId]">) {
  try {
    await requireRole(request, ["ADMIN"]); const { id: categoryId, imageId } = await ctx.params;
    const [existing] = await db.select().from(categoryImages).where(and(eq(categoryImages.id, imageId), eq(categoryImages.categoryId, categoryId))).limit(1);
    if (!existing) return jsonError("Category image not found", 404);
    await storage.deleteObject(existing.storageKey);
    await db.transaction(async (tx) => { await tx.delete(categoryImages).where(eq(categoryImages.id, imageId)); if (existing.isPrimary) { const [next] = await tx.select().from(categoryImages).where(eq(categoryImages.categoryId, categoryId)).orderBy(asc(categoryImages.sortOrder)).limit(1); if (next) await tx.update(categoryImages).set({ isPrimary: true, updatedAt: new Date() }).where(eq(categoryImages.id, next.id)); } });
    return jsonOk({ deleted: true, id: imageId });
  } catch (error) { if (error instanceof Response) return error; if (error instanceof StorageConfigurationError) return jsonError(error.message, 503); return handleApiError(error); }
}
