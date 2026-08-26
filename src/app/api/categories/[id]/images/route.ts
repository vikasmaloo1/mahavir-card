import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categoryImages } from "@/lib/db/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/categories/[id]/images">) {
  try { const { id } = await ctx.params; const rows = await db.select({ id: categoryImages.id, imageUrl: categoryImages.imageUrl, originalFilename: categoryImages.originalFilename, contentType: categoryImages.contentType, fileSize: categoryImages.fileSize, altText: categoryImages.altText, sortOrder: categoryImages.sortOrder, isPrimary: categoryImages.isPrimary }).from(categoryImages).where(eq(categoryImages.categoryId, id)).orderBy(asc(categoryImages.sortOrder)); return jsonOk(rows); } catch (error) { return handleApiError(error); }
}
