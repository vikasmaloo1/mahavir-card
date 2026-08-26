import { desc } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); return jsonOk(await db.select().from(artworks).orderBy(desc(artworks.createdAt))); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
