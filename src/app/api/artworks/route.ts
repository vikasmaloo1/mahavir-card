import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { getAdminAccess, requireUser, requireRole } from "@/lib/permissions";
import { artworkSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const admin = await getAdminAccess(request);
    const data = admin ? await db.select().from(artworks).orderBy(desc(artworks.createdAt)) : await db.select().from(artworks).where(eq(artworks.uploadedBy, session.user.id)).orderBy(desc(artworks.createdAt));
    return jsonOk(data);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, artworkSchema);
    const [artwork] = await db.insert(artworks).values({
      ...input,
      uploadedBy: session.user.id,
    }).returning();
    return artwork ? jsonOk(artwork, 201) : jsonError("Artwork was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    return jsonError("Artwork deletion is disabled; archive it from the admin workflow", 405);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
