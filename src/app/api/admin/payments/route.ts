import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orders, payments } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); const data = await db.select({ payment: payments, orderNumber: orders.orderNumber, customerEmail: customers.email }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).leftJoin(customers, eq(payments.customerId, customers.id)).orderBy(desc(payments.createdAt)); return jsonOk(data); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
