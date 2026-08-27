import { eq } from "drizzle-orm";

import { recalculateQuote } from "@/lib/admin-quote-service";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orders, quoteItems, quotes, storedDocuments } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminQuoteUpdateSchema } from "@/lib/validation";
import { canTransition } from "@/lib/workflows";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!quote) return jsonError("Quote not found", 404);
    const [items, artworkRows, documents, convertedOrder, customer] = await Promise.all([
      db.select().from(quoteItems).where(eq(quoteItems.quoteId, id)),
      db.select().from(artworks).where(eq(artworks.quoteId, id)),
      db.select().from(storedDocuments).where(eq(storedDocuments.quoteId, id)),
      db.select().from(orders).where(eq(orders.quoteId, id)).limit(1),
      quote.customerId ? db.select().from(customers).where(eq(customers.id, quote.customerId)).limit(1) : Promise.resolve([]),
    ]);
    return jsonOk({ quote, items, artworks: artworkRows, documents, order: convertedOrder[0] ?? null, customer: customer[0] ?? null });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, adminQuoteUpdateSchema);
    const [existing] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!existing) return jsonError("Quote not found", 404);
    if (input.status && !canTransition("quote", existing.status, input.status)) return jsonError(`Cannot move a quote from ${existing.status} to ${input.status}`, 409);
    const [quote] = await db.update(quotes).set({ ...input, updatedAt: new Date() }).where(eq(quotes.id, id)).returning();
    if (!quote) return jsonError("Quote not found", 404);
    return jsonOk(await recalculateQuote(id));
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
