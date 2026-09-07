import { and, asc, eq, sql } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orderItems, orders, orderStatusEvents, payments, storedDocuments, walletTransactions } from "@/lib/db/schema";
import { emitNotification } from "@/lib/notifications/emit";
import { requireRole } from "@/lib/permissions";
import { adminOrderUpdateSchema } from "@/lib/validation";
import { canTransition } from "@/lib/workflows";
import { mapItemsWithArtworks } from "@/lib/order-artwork-mapping";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);
    const [items, payment, artworkRows, documents, customer, history] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(payments).where(eq(payments.orderId, id)).limit(1),
      db.select().from(artworks).where(eq(artworks.orderId, id)),
      db.select().from(storedDocuments).where(eq(storedDocuments.orderId, id)),
      order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1) : Promise.resolve([]),
      db.select().from(orderStatusEvents).where(eq(orderStatusEvents.orderId, id)).orderBy(asc(orderStatusEvents.createdAt)),
    ]);
    const { mappedItems, unmappedArtworks } = mapItemsWithArtworks(items, artworkRows);
    return jsonOk({ order, items: mappedItems, payment: payment[0] ?? null, artworks: artworkRows, unmappedArtworks, documents, customer: customer[0] ?? null, history });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, adminOrderUpdateSchema);
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!existing) return { error: "NOT_FOUND" as const };
      if (input.status && !canTransition("order", existing.status, input.status)) return { error: "INVALID_TRANSITION" as const, currentStatus: existing.status };

      if (input.status === "CANCELLED" && existing.status !== "CANCELLED") {
        const [payment] = await tx.select().from(payments).where(eq(payments.orderId, id)).limit(1);
        if (payment && payment.customerId && (payment.status === "PAID" || (payment.method === "CREDIT" && payment.status === "CREDIT_APPROVED"))) {
          const [releasedPayment] = await tx.update(payments).set({ status: "REFUNDED", updatedAt: new Date() }).where(eq(payments.id, payment.id)).returning({ id: payments.id });
          if (releasedPayment) {
            const restoredBalance = sql`${customers.availableCredit} + ${payment.amount}`;
            const [creditCustomer] = await tx.update(customers).set({ availableCredit: restoredBalance, walletBalance: restoredBalance, updatedAt: new Date() }).where(eq(customers.id, payment.customerId)).returning({ availableCredit: customers.availableCredit });
            if (creditCustomer) await tx.insert(walletTransactions).values({
              customerId: payment.customerId,
              transactionType: payment.method === "CREDIT" ? "CREDIT_RELEASE" : "REFUND",
              status: "APPROVED",
              amount: payment.amount,
              balanceAfter: creditCustomer.availableCredit,
              reference: existing.orderNumber,
              notes: `Refund credited to wallet for cancelled order ${existing.orderNumber}`,
              createdBy: session.user.id,
            });
          }
        }
      }

      const statusChanged = Boolean(input.status && input.status !== existing.status);
      const [order] = await tx.update(orders).set({ ...input, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
      if (order && statusChanged) await tx.insert(orderStatusEvents).values({ orderId: id, status: input.status!, notes: input.notes ?? null, changedBy: session.user.id });
      return { order, statusChanged };
    });
    if ("error" in result) {
      if (result.error === "NOT_FOUND") return jsonError("Order not found", 404);
      return jsonError(`Cannot move an order from ${result.currentStatus} to ${input.status}`, 409);
    }
    if (result.order && result.statusChanged && input.status && result.order.customerId) {
      const [customer] = await db.select({ email: customers.email, contactName: customers.contactName }).from(customers).where(eq(customers.id, result.order.customerId)).limit(1);
      const event = input.status === "READY" ? "ORDER_READY" : input.status === "DISPATCHED" ? "ORDER_DISPATCHED" : "ORDER_STATUS_CHANGED";
      // ORDER_STATUS_CHANGED can legitimately fire more than once per order (one per
      // transition) — a plain (event, order, orderId) dedupe key would silently drop
      // every transition after the first, so the status is folded into the key.
      const dedupeEntityId = event === "ORDER_STATUS_CHANGED" ? `${result.order.id}:${input.status}` : result.order.id;
      await emitNotification({
        customerId: result.order.customerId,
        event,
        relatedEntityType: "order",
        relatedEntityId: dedupeEntityId,
        recipientEmail: customer?.email ?? null,
        context: { customerName: customer?.contactName, orderNumber: result.order.orderNumber, status: input.status },
      });
    }
    return result.order ? jsonOk(result.order) : jsonError("Order not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
