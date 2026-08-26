import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { brandingAssets } from "@/lib/db/schema";

export async function GET(request: Request) {
  try { const key = new URL(request.url).searchParams.get("key"); const conditions = [eq(brandingAssets.isPublic, true), eq(brandingAssets.isActive, true)]; if (key) conditions.push(eq(brandingAssets.assetKey, key)); const rows = await db.select({ id: brandingAssets.id, assetKey: brandingAssets.assetKey, assetType: brandingAssets.assetType, imageUrl: brandingAssets.imageUrl, altText: brandingAssets.altText, contentType: brandingAssets.contentType, fileSize: brandingAssets.fileSize }).from(brandingAssets).where(and(...conditions)).orderBy(asc(brandingAssets.createdAt)); return jsonOk(rows); } catch (error) { return handleApiError(error); }
}
