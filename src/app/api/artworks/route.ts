import { desc, eq } from "drizzle-orm";

import { publicArtwork } from "@/lib/artwork-storage";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { getAdminAccess, requireUser, requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const admin = await getAdminAccess(request);
    const data = admin ? await db.select().from(artworks).orderBy(desc(artworks.createdAt)) : await db.select().from(artworks).where(eq(artworks.uploadedBy, session.user.id)).orderBy(desc(artworks.createdAt));
    return jsonOk(data.map(publicArtwork));
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST() {
  return jsonError("Start artwork uploads through /api/artworks/upload-url.", 405);
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    return jsonError("Delete a specific artwork through its protected resource endpoint.", 405);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
