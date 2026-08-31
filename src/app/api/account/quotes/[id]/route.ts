import { and, eq, or } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { artworks, customers, orders, quoteItems, quotes, storedDocuments } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireUser } from "@/lib/permissions";

const decisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]), message: z.string().trim().max(1000).nullable().optional() });

async function ownershipCondition(userId: string, quoteId: string) {
  const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
  return and(eq(quotes.id, quoteId), customer ? or(eq(quotes.userId, userId), eq(quotes.customerId, customer.id)) : eq(quotes.userId, userId));
}

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
    const status = input.decision === "APPROVE" ? "CUSTOMER_APPROVED" : "CUSTOMER_REJECTED";
    const [quote] = await db.update(quotes).set({ status, customerMessage: input.message ?? null, updatedAt: new Date() }).where(and(await ownershipCondition(session.user.id, id), eq(quotes.status, "SENT_TO_CUSTOMER"))).returning();
    return quote ? jsonOk(quote) : jsonError("This quote is not awaiting your decision", 409);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
