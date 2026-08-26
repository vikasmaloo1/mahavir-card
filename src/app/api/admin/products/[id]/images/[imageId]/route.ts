import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { productImages, products } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage, storageKeys, validateImageFile } from "@/lib/storage";

const metadataSchema = z.object({ altText: z.string().trim().max(300).nullable().optional(), sortOrder: z.coerce.number().int().min(0).optional(), isPrimary: z.boolean().optional() });
function formText(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/products/[id]/images/[imageId]">) {
  let newKey: string | null = null;
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: productId, imageId } = await ctx.params;
    const [existing] = await db.select().from(productImages).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId))).limit(1);
    if (!existing) return jsonError("Product image not found", 404);
    const contentType = request.headers.get("content-type") ?? "";
    let input: z.infer<typeof metadataSchema> = {};
    let replacement: File | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const candidate = form.get("file");
      replacement = candidate instanceof File && candidate.size ? candidate : null;
      input = metadataSchema.parse({ altText: formText(form, "altText") || null, sortOrder: formText(form, "sortOrder") || existing.sortOrder, isPrimary: formText(form, "isPrimary") ? formText(form, "isPrimary") === "true" : existing.isPrimary });
    } else input = metadataSchema.parse(await request.json());
    if (replacement) {
      await validateImageFile(replacement);
      newKey = storageKeys.productImage(productId, replacement.name);
      await storage.uploadObject({ key: newKey, body: new Uint8Array(await replacement.arrayBuffer()), contentType: replacement.type, contentLength: replacement.size, visibility: "PUBLIC", metadata: { resource: "product-image", productId } });
    }
    const imageUrl = `/api/products/${productId}/images/${imageId}/file`;
    const [updated] = await db.transaction(async (tx) => {
      if (input.isPrimary) await tx.update(productImages).set({ isPrimary: false, updatedAt: new Date() }).where(eq(productImages.productId, productId));
      const values = { ...input, ...(replacement && newKey ? { storageKey: newKey, imageUrl, originalFilename: replacement.name, contentType: replacement.type, fileSize: replacement.size } : {}), updatedAt: new Date() };
      const result = await tx.update(productImages).set(values).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId))).returning();
      if (input.isPrimary) await tx.update(products).set({ imageUrl, updatedAt: new Date() }).where(eq(products.id, productId));
      return result;
    });
    if (!updated) return jsonError("Product image not found", 404);
    if (replacement && existing.storageKey && existing.storageKey !== newKey) await storage.deleteObject(existing.storageKey).catch((error) => console.error("R2 product image cleanup failed", { imageId, error }));
    return jsonOk(updated);
  } catch (error) {
    if (newKey) await storage.deleteObject(newKey).catch(() => undefined);
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError || error instanceof z.ZodError) return jsonError(error instanceof Error ? error.message : "Invalid image metadata", 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/products/[id]/images/[imageId]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: productId, imageId } = await ctx.params;
    const [existing] = await db.select().from(productImages).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId))).limit(1);
    if (!existing) return jsonError("Product image not found", 404);
    if (existing.storageKey) await storage.deleteObject(existing.storageKey);
    await db.transaction(async (tx) => {
      await tx.delete(productImages).where(eq(productImages.id, imageId));
      if (existing.isPrimary) {
        const [next] = await tx.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder)).limit(1);
        if (next) await tx.update(productImages).set({ isPrimary: true, updatedAt: new Date() }).where(eq(productImages.id, next.id));
        await tx.update(products).set({ imageUrl: next?.imageUrl ?? null, updatedAt: new Date() }).where(eq(products.id, productId));
      }
    });
    return jsonOk({ deleted: true, id: imageId });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
