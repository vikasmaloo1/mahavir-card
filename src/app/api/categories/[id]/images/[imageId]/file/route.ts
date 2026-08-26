import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categories, categoryImages } from "@/lib/db/schema";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(_request: Request, ctx: RouteContext<"/api/categories/[id]/images/[imageId]/file">) {
  try { const { id: categoryId, imageId } = await ctx.params; const [image] = await db.select({ storageKey: categoryImages.storageKey, filename: categoryImages.originalFilename, contentType: categoryImages.contentType }).from(categoryImages).innerJoin(categories, eq(categoryImages.categoryId, categories.id)).where(and(eq(categoryImages.id, imageId), eq(categoryImages.categoryId, categoryId), eq(categories.isActive, true))).limit(1); if (!image) return jsonError("Image not found", 404); return Response.redirect(await storage.getSignedDownloadUrl({ key: image.storageKey, filename: image.filename, contentType: image.contentType, disposition: "inline", expiresIn: 900 }), 302); } catch (error) { if (error instanceof StorageConfigurationError) return jsonError(error.message, 503); return handleApiError(error); }
}
