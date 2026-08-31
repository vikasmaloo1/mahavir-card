import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { orders, orderStatusEvents, payments, paymentTransactions } from "@/lib/db/schema";

export class RazorpayPaymentStateError extends Error {}

export async function markRazorpayPaymentPaid(input: { providerOrderId: string; providerPaymentId: string; amountPaise?: number; rawData?: Record<string, unknown>; changedBy?: string | null }) {
  return db.transaction(async (tx) => {
    const [record] = await tx.select({ payment: payments, order: orders }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(and(eq(payments.provider, "RAZORPAY"), eq(payments.providerOrderId, input.providerOrderId))).limit(1);
    if (!record) throw new RazorpayPaymentStateError("Razorpay order was not found");
    if (input.amountPaise !== undefined && Math.round(Number(record.payment.amount) * 100) !== input.amountPaise) throw new RazorpayPaymentStateError("Razorpay payment amount does not match the order");
    if (record.payment.status === "PAID") {
      if (record.payment.providerPaymentId && record.payment.providerPaymentId !== input.providerPaymentId) throw new RazorpayPaymentStateError("This Razorpay order already has another verified payment");
      return record;
    }
    const [payment] = await tx.update(payments).set({ status: "PAID", providerPaymentId: input.providerPaymentId, updatedAt: new Date() }).where(and(eq(payments.id, record.payment.id), eq(payments.status, "PENDING"))).returning();
    if (!payment) throw new RazorpayPaymentStateError("Payment is no longer awaiting verification");
    await tx.insert(paymentTransactions).values({ paymentId: payment.id, transactionId: input.providerPaymentId, status: "PAID", amount: payment.amount, rawData: input.rawData ?? {} }).onConflictDoNothing({ target: paymentTransactions.transactionId });
    let order = record.order;
    if (order.status === "PENDING") {
      [order] = await tx.update(orders).set({ status: "CONFIRMED", updatedAt: new Date() }).where(and(eq(orders.id, order.id), eq(orders.status, "PENDING"))).returning();
      if (order) await tx.insert(orderStatusEvents).values({ orderId: order.id, status: "CONFIRMED", notes: "Razorpay payment verified", changedBy: input.changedBy ?? null });
    }
    return { payment, order: order ?? record.order };
  });
}
