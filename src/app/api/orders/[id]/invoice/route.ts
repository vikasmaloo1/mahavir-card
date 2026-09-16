import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { businessSettings, categories, customers, orderItems, orders, products } from "@/lib/db/schema";
import { buildInvoiceData } from "@/lib/invoice-helper";
import { getOrAllocateInvoiceNumber } from "@/lib/invoice-sequence-server";
import { requireUser } from "@/lib/permissions";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    const [customerRows] = await Promise.all([
      order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1) : Promise.resolve([]),
    ]);
    const customer = customerRows[0] || null;

    // Invoicing is only available for B2C orders
    if (customer && customer.customerType !== "B2C") {
      return jsonError("Tax invoice is only available for B2C orders", 403);
    }

    // Verify customer ownership if not ADMIN
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "SUPERADMIN";
    if (!isAdmin && customer && customer.userId !== session.user.id) {
      return jsonError("Forbidden", 403);
    }

    // For customers, invoice is only available after order is dispatched or delivered
    if (!isAdmin) {
      const isDispatchedOrDelivered = order.status === "DISPATCHED" || order.status === "DELIVERED";
      if (!isDispatchedOrDelivered) {
        return jsonError("Tax invoice will be available once your order is dispatched.", 403);
      }
    }

    const [items, settingsRows] = await Promise.all([
      db
        .select({
          id: orderItems.id,
          orderId: orderItems.orderId,
          productId: orderItems.productId,
          description: orderItems.description,
          jobName: orderItems.jobName,
          configuration: orderItems.configuration,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
          hsnCode: categories.hsnCode,
        })
        .from(orderItems)
        .leftJoin(products, eq(orderItems.productId, products.id))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(orderItems.orderId, id)),
      db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1),
    ]);

    const settings = settingsRows[0] || null;
    const allocation = await getOrAllocateInvoiceNumber(order.id);
    const invoiceData = buildInvoiceData(
      {
        ...order,
        invoiceNumber: allocation.invoiceNumber,
        invoiceYear: allocation.invoiceYear,
        invoiceSequence: allocation.invoiceSequence,
        invoiceDate: allocation.invoiceDate,
      },
      customer,
      items,
      settings
    );

    return jsonOk(invoiceData);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}