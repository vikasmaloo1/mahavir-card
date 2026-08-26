import { and, eq } from "drizzle-orm";

import { publicArtwork } from "@/lib/artwork-storage";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { getAdminAccess, requireUser } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/artworks/[id]">) {
  try {
    const session = await requireUser(request);
    const admin = await getAdminAccess(request);
    const { id } = await ctx.params;
    const [artwork] = admin
      ? await db.select().from(artworks).where(eq(artworks.id, id)).limit(1)
      : await db.select().from(artworks).where(and(eq(artworks.id, id), eq(artworks.uploadedBy, session.user.id))).limit(1);
    return artwork ? jsonOk(publicArtwork(artwork)) : jsonError("Artwork not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/artworks/[id]">) {
  try {
    const session = await requireUser(request);
    const admin = await getAdminAccess(request);
    const { id } = await ctx.params;
    const [artwork] = admin
      ? await db.select().from(artworks).where(eq(artworks.id, id)).limit(1)
      : await db.select().from(artworks).where(and(eq(artworks.id, id), eq(artworks.uploadedBy, session.user.id))).limit(1);
    if (!artwork) return jsonError("Artwork not found", 404);
    if (artwork.storageKey) await storage.deleteObject(artwork.storageKey);
    await db.delete(artworks).where(eq(artworks.id, id));
    return jsonOk({ deleted: true, id });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
