import { and, eq, sql } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orders, orderStatusEvents, payments, walletTransactions } from "@/lib/db/schema";
import { emitNotification } from "@/lib/notifications/emit";
import { requireUser } from "@/lib/permissions";

export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.userId, session.user.id))
      .limit(1);

    if (!customer) return jsonError("Customer profile not found", 404);

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.customerId, customer.id)))
      .limit(1);

    if (!order) return jsonError("Order not found or does not belong to you", 404);

    if (order.status === "CANCELLED") {
      return jsonError("This order is already cancelled", 409);
    }

    // Only allow cancellation while PENDING or CONFIRMED (before IN_PRODUCTION)
    if (order.status !== "PENDING" && order.status !== "CONFIRMED") {
      return jsonError(
        "Orders that have entered production or are already dispatched cannot be cancelled online. Please contact support.",
        400,
      );
    }

    const result = await db.transaction(async (tx) => {
      const [cancelledOrder] = await tx
        .update(orders)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      await tx.insert(orderStatusEvents).values({
        orderId: id,
        status: "CANCELLED",
        notes: "Cancelled by customer.",
        changedBy: session.user.id,
      });

      return { cancelledOrder };
    });

    if (result.cancelledOrder) {
      await emitNotification({
        customerId: customer.id,
        event: "ORDER_STATUS_CHANGED",
        relatedEntityType: "order",
        relatedEntityId: `${result.cancelledOrder.id}:CANCELLED`,
        recipientEmail: customer.email,
        context: {
          customerName: customer.contactName,
          orderNumber: result.cancelledOrder.orderNumber,
          status: "CANCELLED",
        },
      });
    }

    return jsonOk({
      order: result.cancelledOrder,
      refunded: false,
      message: "Order cancelled successfully.",
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}