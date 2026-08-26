import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orders, payments } from "@/lib/db/schema";
import { createPaymentIntent } from "@/lib/payment-service";
import { getSession } from "@/lib/permissions";
import { paymentSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/orders/[id]/payment">) {
  try { const session = await getSession(request); if (!session) return jsonError("Authentication required", 401); const { id } = await ctx.params; const [payment] = await db.select({ payment: payments }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(payments.orderId, id), eq(customers.userId, session.user.id))).limit(1); return payment ? jsonOk(payment.payment) : jsonError("Payment not found", 404); } catch (error) { return handleApiError(error); }
}

export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/payment">) {
  try { const session = await getSession(request); if (!session) return jsonError("Authentication required", 401); const { id } = await ctx.params; const input = await readBody(request, paymentSchema); if (input.orderId !== id) return jsonError("Order mismatch", 422); const [ownedOrder] = await db.select({ order: orders, customer: customers }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(orders.id, id), eq(customers.userId, session.user.id))).limit(1); if (!ownedOrder) return jsonError("Order not found", 404); const intent = createPaymentIntent(input.method, input.amount); const [payment] = await db.insert(payments).values({ orderId: id, customerId: ownedOrder.customer.id, method: input.method, amount: input.amount, status: intent.status, provider: intent.provider }).returning(); return payment ? jsonOk(payment, 201) : jsonError("Payment was not created", 500); } catch (error) { return handleApiError(error); }
}
