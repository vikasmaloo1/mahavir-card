import { and, eq } from "drizzle-orm";

import { recalculateQuote } from "@/lib/admin-quote-service";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { quoteItems, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminQuoteItemSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]/items/[itemId]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id, itemId } = await ctx.params;
    const [quote] = await db.select({ status: quotes.status }).from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!quote) return jsonError("Quote not found", 404);
    if (!["NEW", "REVIEWING", "QUOTE_CREATED"].includes(quote.status)) return jsonError("A sent quotation cannot be changed. Create a revised quote instead.", 409);
    const input = await readBody(request, adminQuoteItemSchema);
    const [item] = await db.update(quoteItems).set({ ...input, totalPrice: (input.quantity * Number(input.unitPrice)).toFixed(2) }).where(and(eq(quoteItems.id, itemId), eq(quoteItems.quoteId, id))).returning();
    if (!item) return jsonError("Quote item not found", 404);
    await recalculateQuote(id);
    return jsonOk(item);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]/items/[itemId]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id, itemId } = await ctx.params;
    const [quote] = await db.select({ status: quotes.status }).from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!quote) return jsonError("Quote not found", 404);
    if (!["NEW", "REVIEWING", "QUOTE_CREATED"].includes(quote.status)) return jsonError("A sent quotation cannot be changed. Create a revised quote instead.", 409);
    const [item] = await db.delete(quoteItems).where(and(eq(quoteItems.id, itemId), eq(quoteItems.quoteId, id))).returning();
    if (!item) return jsonError("Quote item not found", 404);
    await recalculateQuote(id);
    return jsonOk({ deleted: true, id: itemId });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
