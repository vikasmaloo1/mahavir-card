import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { getSession } from "@/lib/permissions";

export async function GET(request: Request, ctx: RouteContext<"/api/artworks/[id]">) {
  try { const session = await getSession(request); if (!session) return jsonError("Authentication required", 401); const { id } = await ctx.params; const [artwork] = await db.select().from(artworks).where(and(eq(artworks.id, id), eq(artworks.uploadedBy, session.user.id))).limit(1); return artwork ? jsonOk(artwork) : jsonError("Artwork not found", 404); } catch (error) { return handleApiError(error); }
}
