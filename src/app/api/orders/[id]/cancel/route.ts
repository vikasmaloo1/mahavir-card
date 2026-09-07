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
      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.orderId, id))
        .limit(1);

      let refundProcessed = false;
      let refundedAmount = "0.00";

      // If payment was completed or credit reserved, refund back to wallet
      const isPaid =
        payment &&
        (payment.status === "PAID" ||
          (payment.method === "CREDIT" && payment.status === "CREDIT_APPROVED"));

      if (isPaid && payment.customerId) {
        refundedAmount = payment.amount;
        refundProcessed = true;

        await tx
          .update(payments)
          .set({ status: "REFUNDED", updatedAt: new Date() })
          .where(eq(payments.id, payment.id));

        const restoredBalance = sql`${customers.availableCredit} + ${payment.amount}`;
        const [creditCustomer] = await tx
          .update(customers)
          .set({
            availableCredit: restoredBalance,
            walletBalance: restoredBalance,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customer.id))
          .returning({ availableCredit: customers.availableCredit });

        await tx.insert(walletTransactions).values({
          customerId: customer.id,
          transactionType: payment.method === "CREDIT" ? "CREDIT_RELEASE" : "REFUND",
          status: "APPROVED",
          amount: payment.amount,
          balanceAfter: creditCustomer?.availableCredit ?? null,
          reference: order.orderNumber,
          notes: `Refund credited to wallet for cancelled order ${order.orderNumber}`,
          createdBy: session.user.id,
        });
      }

      const [cancelledOrder] = await tx
        .update(orders)
        .set({ status: "CANCELLED", updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      await tx.insert(orderStatusEvents).values({
        orderId: id,
        status: "CANCELLED",
        notes: refundProcessed
          ? `Cancelled by customer. Refund of ₹${refundedAmount} credited to wallet.`
          : "Cancelled by customer.",
        changedBy: session.user.id,
      });

      return { cancelledOrder, refundProcessed, refundedAmount };
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
          nextAction: result.refundProcessed
            ? `₹${result.refundedAmount} has been refunded to your wallet balance.`
            : undefined,
        },
      });
    }

    return jsonOk({
      order: result.cancelledOrder,
      refunded: result.refundProcessed,
      refundAmount: result.refundedAmount,
      message: result.refundProcessed
        ? `Order cancelled successfully. ₹${result.refundedAmount} has been credited back to your wallet.`
        : "Order cancelled successfully.",
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}