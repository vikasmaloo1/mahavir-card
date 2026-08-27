import { and, eq } from "drizzle-orm";

import { recalculateQuote } from "@/lib/admin-quote-service";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { quoteItems } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminQuoteItemSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]/items/[itemId]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id, itemId } = await ctx.params;
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
    const [item] = await db.delete(quoteItems).where(and(eq(quoteItems.id, itemId), eq(quoteItems.quoteId, id))).returning();
    if (!item) return jsonError("Quote item not found", 404);
    await recalculateQuote(id);
    return jsonOk({ deleted: true, id: itemId });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
