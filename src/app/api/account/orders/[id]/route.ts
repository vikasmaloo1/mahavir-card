import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { artworks, customers, orderItems, orders, orderStatusEvents, payments, storedDocuments } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireUser } from "@/lib/permissions";

export async function GET(request: Request, ctx: RouteContext<"/api/account/orders/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    const [owned] = await db.select({ order: orders }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(orders.id, id), eq(customers.userId, session.user.id))).limit(1);
    if (!owned) return jsonError("Order not found", 404);
    const [items, payment, artworkRows, documents, history] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(payments).where(eq(payments.orderId, id)).limit(1),
      db.select({ id: artworks.id, fileName: artworks.fileName, fileSize: artworks.fileSize, status: artworks.status, notes: artworks.notes }).from(artworks).where(eq(artworks.orderId, id)),
      db.select({ id: storedDocuments.id, documentType: storedDocuments.documentType, originalFilename: storedDocuments.originalFilename, status: storedDocuments.status }).from(storedDocuments).where(eq(storedDocuments.orderId, id)),
      db.select({ id: orderStatusEvents.id, status: orderStatusEvents.status, notes: orderStatusEvents.notes, createdAt: orderStatusEvents.createdAt }).from(orderStatusEvents).where(eq(orderStatusEvents.orderId, id)).orderBy(asc(orderStatusEvents.createdAt)),
    ]);
    return jsonOk({ order: owned.order, items, payment: payment[0] ?? null, artworks: artworkRows, documents, history });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
