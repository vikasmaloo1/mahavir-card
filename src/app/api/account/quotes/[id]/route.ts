import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { artworks, orders, quoteItems, quotes, storedDocuments } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { emitNotification } from "@/lib/notifications/emit";
import { requireUser } from "@/lib/permissions";
import { convertQuoteToOrder, isQuoteExpired } from "@/lib/quote-conversion";
import { quoteOwnershipCondition as ownershipCondition } from "@/lib/quote-ownership";

const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), message: z.string().trim().max(1000).nullable().optional() });

export async function GET(request: Request, ctx: RouteContext<"/api/account/quotes/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    const [quote] = await db.select().from(quotes).where(await ownershipCondition(session.user.id, id)).limit(1);
    if (!quote) return jsonError("Quote not found", 404);
    const [items, artworkRows, documents, convertedOrder] = await Promise.all([
      db.select().from(quoteItems).where(eq(quoteItems.quoteId, id)),
      db.select({ id: artworks.id, fileName: artworks.fileName, fileSize: artworks.fileSize, status: artworks.status, notes: artworks.notes }).from(artworks).where(eq(artworks.quoteId, id)),
      db.select({ id: storedDocuments.id, documentType: storedDocuments.documentType, originalFilename: storedDocuments.originalFilename, status: storedDocuments.status }).from(storedDocuments).where(eq(storedDocuments.quoteId, id)),
      db.select({ id: orders.id, orderNumber: orders.orderNumber, status: orders.status }).from(orders).where(eq(orders.quoteId, id)).limit(1),
    ]);
    return jsonOk({ quote, items, artworks: artworkRows, documents, order: convertedOrder[0] ?? null });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/account/quotes/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    const input = await readBody(request, decisionSchema);

    if (input.decision === "APPROVE") {
      const [existing] = await db.select({ validUntil: quotes.validUntil }).from(quotes).where(and(await ownershipCondition(session.user.id, id), eq(quotes.status, "SENT_TO_CUSTOMER"))).limit(1);
      if (!existing) return jsonError("This quote is not awaiting your decision", 409);
      if (isQuoteExpired(existing)) return jsonError("This quotation's validity period has passed. Request a new quote for the same or updated specifications.", 409);
    }

    const status = input.decision === "APPROVE" ? "CUSTOMER_APPROVED" : "CUSTOMER_REJECTED";
    const [quote] = await db.update(quotes).set({ status, customerMessage: input.message ?? null, updatedAt: new Date() }).where(and(await ownershipCondition(session.user.id, id), eq(quotes.status, "SENT_TO_CUSTOMER"))).returning();
    if (!quote) return jsonError("This quote is not awaiting your decision", 409);

    await emitNotification({
      customerId: quote.customerId,
      event: input.decision === "APPROVE" ? "QUOTE_APPROVED" : "QUOTE_REJECTED",
      relatedEntityType: "quote",
      relatedEntityId: quote.id,
      recipientEmail: quote.email,
      context: { customerName: quote.contactName, quoteNumber: quote.quoteNumber, nextAction: input.decision === "APPROVE" ? "Your order has been created." : undefined },
    });

    if (input.decision === "APPROVE") {
      const result = await convertQuoteToOrder(id);
      if (!result.ok) return jsonOk(quote); // Approved, but order creation needs admin attention (e.g. quote had no items) — surfaced via the admin quote view.
      return jsonOk({ ...quote, order: result.order });
    }

    return jsonOk(quote);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
