import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { getSession } from "@/lib/permissions";
import { ArtworkStorageUnavailableError, artworkStorage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/artworks/[id]">) {
  try { const session = await getSession(request); if (!session) return jsonError("Authentication required", 401); const { id } = await ctx.params; const [artwork] = await db.select().from(artworks).where(and(eq(artworks.id, id), eq(artworks.uploadedBy, session.user.id))).limit(1); return artwork ? jsonOk(artwork) : jsonError("Artwork not found", 404); } catch (error) { return handleApiError(error); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/artworks/[id]">) {
  try {
    const session = await getSession(request);
    if (!session) return jsonError("Authentication required", 401);
    const { id } = await ctx.params;
    const [artwork] = await db.select().from(artworks).where(and(eq(artworks.id, id), eq(artworks.uploadedBy, session.user.id))).limit(1);
    if (!artwork) return jsonError("Artwork not found", 404);
    await artworkStorage.remove(artwork.storageUrl);
    await db.delete(artworks).where(eq(artworks.id, id));
    return jsonOk({ deleted: true, id });
  } catch (error) {
    if (error instanceof ArtworkStorageUnavailableError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
