import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orders, orderStatusEvents, payments, walletTransactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const creditBalanceSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  reason: z.string().trim().min(3, "Reason is required (min 3 characters)"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const { id } = await params;
    const body = await readBody(request, creditBalanceSchema);

    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order) {
        return { error: "Order not found", status: 404 };
      }

      if (order.status !== "CANCELLED") {
        return { error: "Only cancelled orders can be credited to customer balance", status: 400 };
      }

      if (!order.customerId) {
        return { error: "Order does not have an associated customer account", status: 400 };
      }

      const [customer] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, order.customerId))
        .for("update")
        .limit(1);

      if (!customer) {
        return { error: "Customer not found", status: 404 };
      }

      const [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.orderId, id))
        .for("update")
        .limit(1);

      const orderTotal = Number(order.total || 0);
      const paidAmount = Number(payment?.paidAmount ?? (payment?.status === "PAID" || payment?.method === "CREDIT" ? payment.amount : 0));
      const refundedAmount = Number(payment?.refundedAmount || 0);

      // Eligible credit is at most the paid amount or order total, minus already credited/refunded
      const maxCreditable = Math.max(0, Math.min(orderTotal, paidAmount > 0 ? paidAmount : orderTotal) - refundedAmount);

      if (maxCreditable <= 0) {
        return { error: "This order has already been fully credited / refunded", status: 400 };
      }

      if (body.amount > maxCreditable + 0.001) {
        return {
          error: `Amount exceeds maximum creditable amount of ₹${maxCreditable.toFixed(2)}`,
          status: 400,
        };
      }

      const creditAmountStr = body.amount.toFixed(2);
      const balanceBefore = Number(customer.availableCredit || 0);
      const balanceAfter = (balanceBefore + body.amount).toFixed(2);
      const newRefundedAmount = (refundedAmount + body.amount).toFixed(2);

      // Update customer balance
      await tx
        .update(customers)
        .set({
          availableCredit: balanceAfter,
          walletBalance: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));

      // Record wallet ledger transaction
      const [txRecord] = await tx
        .insert(walletTransactions)
        .values({
          customerId: customer.id,
          transactionType: "ORDER_CANCEL_CREDIT",
          status: "APPROVED",
          amount: creditAmountStr,
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter,
          reference: order.orderNumber,
          notes: body.reason,
          createdBy: session.user.id,
        })
        .returning();

      // Update payment record if exists
      if (payment) {
        await tx
          .update(payments)
          .set({
            refundedAmount: newRefundedAmount,
            status: Number(newRefundedAmount) >= orderTotal ? "REFUNDED" : payment.status,
            updatedAt: new Date(),
          })
          .where(eq(payments.id, payment.id));
      }

      // Record order history event
      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: "CANCELLED",
        notes: `Balance credited: ₹${creditAmountStr} by Admin. Reason: ${body.reason}`,
        changedBy: session.user.id,
      });

      return {
        success: true,
        creditedAmount: creditAmountStr,
        newBalance: balanceAfter,
        walletTransaction: txRecord,
      };
    });

    if ("error" in result && result.error) {
      return jsonError(result.error, (result.status as 400 | 404) || 400);
    }

    return jsonOk(result);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
