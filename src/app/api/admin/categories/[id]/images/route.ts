import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categories, categoryImages } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage, storageKeys, validateImageFile } from "@/lib/storage";

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }

export async function POST(request: Request, ctx: RouteContext<"/api/admin/categories/[id]/images">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: categoryId } = await ctx.params;
    const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
    if (!category) return jsonError("Category not found", 404);
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return jsonError("An image file is required", 422);
    await validateImageFile(file);
    const existing = await db.select({ isPrimary: categoryImages.isPrimary }).from(categoryImages).where(eq(categoryImages.categoryId, categoryId)).orderBy(asc(categoryImages.sortOrder));
    const imageId = crypto.randomUUID(); const key = storageKeys.categoryImage(categoryId, file.name); const isPrimary = text(form, "isPrimary") === "true" || !existing.some((item) => item.isPrimary); const imageUrl = `/api/categories/${categoryId}/images/${imageId}/file`;
    await storage.uploadObject({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type, contentLength: file.size, visibility: "PUBLIC", metadata: { resource: "category-image", categoryId } });
    try {
      const [image] = await db.transaction(async (tx) => { if (isPrimary) await tx.update(categoryImages).set({ isPrimary: false, updatedAt: new Date() }).where(eq(categoryImages.categoryId, categoryId)); return tx.insert(categoryImages).values({ id: imageId, categoryId, imageUrl, storageKey: key, originalFilename: file.name, contentType: file.type, fileSize: file.size, altText: text(form, "altText") || null, sortOrder: Number(text(form, "sortOrder")) || existing.length, isPrimary }).returning(); });
      return image ? jsonOk(image, 201) : jsonError("Category image metadata was not saved", 500);
    } catch (error) { await storage.deleteObject(key).catch(() => undefined); throw error; }
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
