import { eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import {
  customers,
  orders,
  orderStatusEvents,
  payments,
  paymentTransactions,
  walletTransactions,
} from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const partialPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.string().trim().min(1, "Payment method is required"),
  reference: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  paymentDate: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const { id } = await params;
    const body = await readBody(request, partialPaymentSchema);

    const result = await db.transaction(async (tx) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, id)).limit(1);
      if (!order) return { error: "Order not found", status: 404 };

      if (order.status === "CANCELLED") {
        return { error: "Cannot record payment on a cancelled order", status: 400 };
      }

      let [payment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.orderId, id))
        .for("update")
        .limit(1);

      if (!payment) {
        const [createdPayment] = await tx
          .insert(payments)
          .values({
            orderId: id,
            customerId: order.customerId,
            method: "COD",
            status: "PENDING",
            amount: order.total,
            paidAmount: "0.00",
            refundedAmount: "0.00",
          })
          .returning();
        payment = createdPayment;
      }

      const orderTotal = Number(order.total || 0);
      const currentPaid = Number(payment.paidAmount || 0);
      const outstanding = Math.max(0, orderTotal - currentPaid);

      if (outstanding <= 0) {
        return { error: "Order is already fully paid", status: 400 };
      }

      if (body.amount > outstanding + 0.001) {
        return {
          error: `Amount exceeds outstanding balance of ₹${outstanding.toFixed(2)}`,
          status: 400,
        };
      }

      const paymentAmountStr = body.amount.toFixed(2);
      const newPaidAmount = (currentPaid + body.amount).toFixed(2);
      const newOutstanding = Math.max(0, orderTotal - Number(newPaidAmount)).toFixed(2);
      const newPaymentStatus = Number(newPaidAmount) >= orderTotal ? "PAID" : "PARTIALLY_PAID";

      // Insert transaction
      const txnId =
        body.reference?.trim() ||
        `txn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      const [transactionRecord] = await tx
        .insert(paymentTransactions)
        .values({
          paymentId: payment.id,
          transactionId: txnId,
          status: "SUCCESS",
          amount: paymentAmountStr,
          rawData: {
            method: body.paymentMethod,
            reference: body.reference || null,
            notes: body.notes || null,
            paymentDate: body.paymentDate || new Date().toISOString(),
            recordedBy: session.user.id,
          },
        })
        .returning();

      // Update payment record
      await tx
        .update(payments)
        .set({
          paidAmount: newPaidAmount,
          status: newPaymentStatus,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));

      // If this was a B2B CREDIT order, repayment replenishes the customer's wallet balance
      let customerNewBalance: string | null = null;
      if (payment.method === "CREDIT" && order.customerId) {
        const [customer] = await tx
          .select()
          .from(customers)
          .where(eq(customers.id, order.customerId))
          .for("update")
          .limit(1);

        if (customer) {
          const balanceBefore = Number(customer.availableCredit || 0);
          const balanceAfter = (balanceBefore + body.amount).toFixed(2);
          customerNewBalance = balanceAfter;

          await tx
            .update(customers)
            .set({
              availableCredit: balanceAfter,
              walletBalance: balanceAfter,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, customer.id));

          await tx.insert(walletTransactions).values({
            customerId: customer.id,
            transactionType: "PAYMENT_CREDIT",
            status: "APPROVED",
            amount: paymentAmountStr,
            balanceBefore: balanceBefore.toFixed(2),
            balanceAfter,
            reference: order.orderNumber,
            notes: `Repayment received for credit order ${order.orderNumber} via ${body.paymentMethod}${body.notes ? `: ${body.notes}` : ""}`,
            createdBy: session.user.id,
          });
        }
      }

      // Record order status event
      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: order.status,
        notes: `Payment received: ₹${paymentAmountStr} via ${body.paymentMethod} (Ref: ${body.reference || "None"}). Total paid: ₹${newPaidAmount} / ₹${order.total}. Outstanding: ₹${newOutstanding}.`,
        changedBy: session.user.id,
      });

      return {
        success: true,
        orderId: order.id,
        amount: paymentAmountStr,
        totalPaid: newPaidAmount,
        outstanding: newOutstanding,
        paymentStatus: newPaymentStatus,
        transaction: transactionRecord,
        customerNewBalance,
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
