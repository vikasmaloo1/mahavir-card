import { eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orders, payments } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";

const submitReferenceSchema = z.object({
  orderId: z.string().uuid(),
  utr: z.string().trim().min(4, "Enter the UPI transaction reference number").max(64),
});

/**
 * Customer-facing step of the no-gateway UPI QR flow: after paying the QR
 * directly (no webhook exists for this), the customer records the UTR/reference
 * number from their UPI app here. This only marks the payment as "reference
 * submitted" (via providerPaymentId) — an admin still has to check the bank
 * statement and flip payments.status to PAID via the existing admin payments
 * screen before the order is treated as paid.
 */
export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, submitReferenceSchema);

    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonError("Customer profile not found", 404);

    const [order] = await db.select({ id: orders.id, customerId: orders.customerId }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order || order.customerId !== customer.id) return jsonError("Order not found", 404);

    const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id)).limit(1);
    if (!payment || payment.method !== "UPI_QR") return jsonError("This order is not using UPI QR payment", 422);
    if (payment.status === "PAID") return jsonError("This order has already been marked as paid", 409);

    const [updated] = await db.update(payments).set({ providerPaymentId: input.utr, updatedAt: new Date() }).where(eq(payments.id, payment.id)).returning();
    return updated ? jsonOk(updated) : jsonError("Could not save your payment reference", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
