import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { getAdminAccess, requireUser } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/artworks/[id]/download">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    const admin = await getAdminAccess(request);
    const [artwork] = admin
      ? await db.select().from(artworks).where(eq(artworks.id, id)).limit(1)
      : await db.select().from(artworks).where(and(eq(artworks.id, id), eq(artworks.uploadedBy, session.user.id))).limit(1);
    if (!artwork?.storageKey || artwork.status === "UPLOADING") return jsonError("Artwork not found", 404);
    const url = await storage.getSignedDownloadUrl({ key: artwork.storageKey, filename: artwork.fileName, contentType: artwork.mimeType, disposition: "attachment", expiresIn: 600 });
    return Response.redirect(url, 302);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
