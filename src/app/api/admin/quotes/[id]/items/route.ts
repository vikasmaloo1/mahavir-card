import { eq } from "drizzle-orm";

import { recalculateQuote } from "@/lib/admin-quote-service";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { quoteItems, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminQuoteItemSchema } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]/items">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [quote] = await db.select({ id: quotes.id }).from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!quote) return jsonError("Quote not found", 404);
    const input = await readBody(request, adminQuoteItemSchema);
    const [item] = await db.insert(quoteItems).values({ ...input, quoteId: id, totalPrice: (input.quantity * Number(input.unitPrice)).toFixed(2) }).returning();
    await recalculateQuote(id);
    return item ? jsonOk(item, 201) : jsonError("Quote item was not created", 500);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
