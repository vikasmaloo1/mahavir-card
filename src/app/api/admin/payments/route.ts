import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orders, payments } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminPaymentSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); const data = await db.select({ payment: payments, orderNumber: orders.orderNumber, customerEmail: customers.email }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).leftJoin(customers, eq(payments.customerId, customers.id)).orderBy(desc(payments.createdAt)); return jsonOk(data); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, adminPaymentSchema);
    const [order] = await db.select({ id: orders.id, customerId: orders.customerId }).from(orders).where(eq(orders.id, input.orderId)).limit(1);
    if (!order) return jsonError("Order not found", 404);
    const [existing] = await db.select({ id: payments.id }).from(payments).where(eq(payments.orderId, input.orderId)).limit(1);
    if (existing) return jsonError("This order already has a payment record. Update that record instead.", 409);
    const [payment] = await db.insert(payments).values({ ...input, customerId: input.customerId ?? order.customerId }).returning();
    return payment ? jsonOk(payment, 201) : jsonError("Payment was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
