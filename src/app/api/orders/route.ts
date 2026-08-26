import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orderItems, orders } from "@/lib/db/schema";
import { getAdminAccess, getSession } from "@/lib/permissions";
import { orderSchema, type OrderInput } from "@/lib/validation";

function makeNumber() {
  return `MHC-O-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) return jsonError("Authentication required", 401);
    const admin = await getAdminAccess(request);
    const data = admin
      ? await db.select().from(orders).orderBy(desc(orders.createdAt))
      : await db.select({ order: orders }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(eq(customers.userId, session.user.id)).orderBy(desc(orders.createdAt)).then((items) => items.map((item) => item.order));
    return jsonOk(data);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) return jsonError("Authentication required", 401);
    const admin = await getAdminAccess(request);
    const input = await readBody(request, orderSchema);
    let customerId = input.customerId;
    if (!admin) {
      const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
      if (!customer) return jsonError("Complete your customer profile before creating an order", 422);
      customerId = customer.id;
    }
    const items = input.items.map((item: OrderInput["items"][number]) => ({
      ...item,
      totalPrice: (item.quantity * Number(item.unitPrice)).toFixed(2),
    }));
    const subtotal = items.reduce((total, item) => total + Number(item.totalPrice), 0).toFixed(2);

    const result = await db.transaction(async (tx) => {
      const [order] = await tx.insert(orders).values({
        orderNumber: makeNumber(),
        quoteId: input.quoteId,
        customerId,
        notes: input.notes,
        subtotal,
        total: subtotal,
      }).returning();

      if (!order) return null;

      await tx.insert(orderItems).values(items.map((item) => ({
        orderId: order.id,
        productId: item.productId,
        variantId: item.variantId,
        description: item.description,
        configuration: item.configuration,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })));

      return order;
    });

    return result ? jsonOk(result, 201) : jsonError("Order was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
