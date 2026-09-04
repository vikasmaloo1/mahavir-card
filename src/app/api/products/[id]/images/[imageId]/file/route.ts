import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { productImages, products } from "@/lib/db/schema";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/products/[id]/images/[imageId]/file">) {
  try {
    const { id: productId, imageId } = await ctx.params;
    const download = new URL(request.url).searchParams.has("download");
    const [image] = await db.select({ storageKey: productImages.storageKey, filename: productImages.originalFilename, contentType: productImages.contentType }).from(productImages).innerJoin(products, eq(productImages.productId, products.id)).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
    if (!image?.storageKey) return jsonError("Image not found", 404);
    return Response.redirect(await storage.getSignedDownloadUrl({ key: image.storageKey, filename: image.filename ?? "product-image", contentType: image.contentType ?? "application/octet-stream", disposition: download ? "attachment" : "inline", expiresIn: 900 }), 302);
  } catch (error) {
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
