import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { artworkUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/artworks/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [artwork] = await db.select().from(artworks).where(eq(artworks.id, id)).limit(1); return artwork ? jsonOk(artwork) : jsonError("Artwork not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/artworks/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, artworkUpdateSchema); const [artwork] = await db.update(artworks).set({ ...input, updatedAt: new Date() }).where(eq(artworks.id, id)).returning(); return artwork ? jsonOk(artwork) : jsonError("Artwork not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
