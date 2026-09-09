import { and, asc, desc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { artworks, customers, orderItems, orders, orderStatusEvents, payments, paymentTransactions, storedDocuments } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireUser } from "@/lib/permissions";

import { mapItemsWithArtworks } from "@/lib/order-artwork-mapping";

export async function GET(request: Request, ctx: RouteContext<"/api/account/orders/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    const [owned] = await db
      .select({
        order: orders,
        customer: { id: customers.id, customerType: customers.customerType },
      })
      .from(orders)
      .innerJoin(customers, eq(orders.customerId, customers.id))
      .where(and(eq(orders.id, id), eq(customers.userId, session.user.id)))
      .limit(1);
    if (!owned) return jsonError("Order not found", 404);
    const [items, paymentRows, artworkRows, documents, history] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(payments).where(eq(payments.orderId, id)).limit(1),
      db.select({ id: artworks.id, fileName: artworks.fileName, fileSize: artworks.fileSize, status: artworks.status, notes: artworks.notes }).from(artworks).where(eq(artworks.orderId, id)),
      db.select({ id: storedDocuments.id, documentType: storedDocuments.documentType, originalFilename: storedDocuments.originalFilename, status: storedDocuments.status }).from(storedDocuments).where(eq(storedDocuments.orderId, id)),
      db.select({ id: orderStatusEvents.id, status: orderStatusEvents.status, notes: orderStatusEvents.notes, createdAt: orderStatusEvents.createdAt }).from(orderStatusEvents).where(eq(orderStatusEvents.orderId, id)).orderBy(asc(orderStatusEvents.createdAt)),
    ]);

    const activePayment = paymentRows[0] ?? null;
    let transactions: Array<{
      id: string;
      transactionId: string | null;
      status: string;
      amount: string;
      rawData: Record<string, unknown>;
      createdAt: Date | string;
    }> = [];

    if (activePayment) {
      transactions = await db
        .select({
          id: paymentTransactions.id,
          transactionId: paymentTransactions.transactionId,
          status: paymentTransactions.status,
          amount: paymentTransactions.amount,
          rawData: paymentTransactions.rawData,
          createdAt: paymentTransactions.createdAt,
        })
        .from(paymentTransactions)
        .where(eq(paymentTransactions.paymentId, activePayment.id))
        .orderBy(desc(paymentTransactions.createdAt));
    }

    const { mappedItems } = mapItemsWithArtworks(items, artworkRows);
    return jsonOk({
      order: owned.order,
      customer: owned.customer,
      items: mappedItems,
      payment: activePayment ? { ...activePayment, transactions } : null,
      paymentTransactions: transactions,
      artworks: artworkRows,
      documents,
      history,
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
