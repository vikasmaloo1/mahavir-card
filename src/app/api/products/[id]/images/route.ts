import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { productImages } from "@/lib/db/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/products/[id]/images">) {
  try {
    const { id } = await ctx.params;
    const images = await db.select({ id: productImages.id, imageUrl: productImages.imageUrl, originalFilename: productImages.originalFilename, contentType: productImages.contentType, fileSize: productImages.fileSize, altText: productImages.altText, sortOrder: productImages.sortOrder, isPrimary: productImages.isPrimary }).from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder));
    return jsonOk(images);
  } catch (error) { return handleApiError(error); }
}
