import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { brandingAssets } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/branding/assets/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [asset] = await db.select().from(brandingAssets).where(eq(brandingAssets.id, id)).limit(1); if (!asset) return jsonError("Branding asset not found", 404); await storage.deleteObject(asset.storageKey); await db.delete(brandingAssets).where(eq(brandingAssets.id, id)); return jsonOk({ deleted: true, id }); } catch (error) { if (error instanceof Response) return error; if (error instanceof StorageConfigurationError) return jsonError(error.message, 503); return handleApiError(error); }
}
