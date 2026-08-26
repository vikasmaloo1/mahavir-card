import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { brandingAssets } from "@/lib/db/schema";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/branding/assets/[key]/file">) {
  try { const { key } = await ctx.params; const [asset] = await db.select().from(brandingAssets).where(and(eq(brandingAssets.assetKey, key), eq(brandingAssets.isActive, true), eq(brandingAssets.isPublic, true))).limit(1); if (!asset) { if (key === "logo.primary") return Response.redirect(new URL("/images/mahavir-card-logo.jpeg", request.url), 302); return jsonError("Branding asset not found", 404); } return Response.redirect(await storage.getSignedDownloadUrl({ key: asset.storageKey, filename: asset.originalFilename, contentType: asset.contentType, disposition: "inline", expiresIn: 900 }), 302); } catch (error) { if (error instanceof StorageConfigurationError) return jsonError(error.message, 503); return handleApiError(error); }
}
