import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { quoteItems, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminQuoteUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1); if (!quote) return jsonError("Quote not found", 404); const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id)); return jsonOk({ quote, items }); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, adminQuoteUpdateSchema); const [quote] = await db.update(quotes).set({ ...input, updatedAt: new Date() }).where(eq(quotes.id, id)).returning(); return quote ? jsonOk(quote) : jsonError("Quote not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
