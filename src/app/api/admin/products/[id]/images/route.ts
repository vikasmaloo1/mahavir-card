import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { productImages, products } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage, storageKeys, validateImageFile } from "@/lib/storage";

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }
function integer(value: string, fallback: number) { const parsed = Number(value); return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback; }

export async function GET(request: Request, ctx: RouteContext<"/api/admin/products/[id]/images">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: productId } = await ctx.params;
    const images = await db.select({ id: productImages.id, imageUrl: productImages.imageUrl, originalFilename: productImages.originalFilename, contentType: productImages.contentType, fileSize: productImages.fileSize, altText: productImages.altText, sortOrder: productImages.sortOrder, isPrimary: productImages.isPrimary, createdAt: productImages.createdAt }).from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder));
    return jsonOk(images);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/admin/products/[id]/images">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: productId } = await ctx.params;
    const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
    if (!product) return jsonError("Product not found", 404);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("An image file is required", 422);
    await validateImageFile(file);
    const existing = await db.select({ id: productImages.id, isPrimary: productImages.isPrimary }).from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder));
    const imageId = crypto.randomUUID();
    const key = storageKeys.productImage(productId, file.name);
    const isPrimary = text(form, "isPrimary") === "true" || !existing.some((item) => item.isPrimary);
    const imageUrl = `/api/products/${productId}/images/${imageId}/file`;
    const uploaded = await storage.uploadObject({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type, contentLength: file.size, visibility: "PUBLIC", metadata: { resource: "product-image", productId } });
    try {
      const image = await db.transaction(async (tx) => {
        if (isPrimary) await tx.update(productImages).set({ isPrimary: false, updatedAt: new Date() }).where(eq(productImages.productId, productId));
        const [created] = await tx.insert(productImages).values({ id: imageId, productId, imageUrl, storageKey: key, originalFilename: file.name, contentType: file.type, fileSize: file.size, altText: text(form, "altText") || null, sortOrder: integer(text(form, "sortOrder"), existing.length), isPrimary }).returning();
        if (isPrimary) await tx.update(products).set({ imageUrl, updatedAt: new Date() }).where(eq(products.id, productId));
        return created;
      });
      return image ? jsonOk({ ...image, etag: uploaded.etag }, 201) : jsonError("Image metadata was not saved", 500);
    } catch (error) {
      await storage.deleteObject(key).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
