import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { orderItems, orders, quoteItems, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]/convert-to-order">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
    if (!quote) return jsonError("Quote not found", 404);
    if (quote.status !== "CUSTOMER_APPROVED") return jsonError("Only a customer-approved quote can be converted", 409);
    const [existing] = await db.select().from(orders).where(eq(orders.quoteId, id)).limit(1);
    if (existing) return jsonOk(existing);
    const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, id));
    if (!items.length) return jsonError("Add at least one quote item before conversion", 409);
    const order = await db.transaction(async (tx) => {
      const [created] = await tx.insert(orders).values({
        orderNumber: `MHC-O-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        quoteId: quote.id,
        customerId: quote.customerId,
        status: "CONFIRMED",
        subtotal: quote.subtotal,
        tax: quote.tax,
        total: quote.total,
        notes: quote.notes,
      }).returning();
      if (!created) return null;
      await tx.insert(orderItems).values(items.map((item) => ({
        orderId: created.id,
        productId: item.productId,
        variantId: item.variantId,
        description: item.description,
        configuration: item.configuration,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        pricingSnapshot: { ...item.pricingSnapshot, quoteId: quote.id, quoteItemId: item.id, discountAmount: quote.discountAmount },
      })));
      await tx.update(quotes).set({ status: "CONVERTED_TO_ORDER", updatedAt: new Date() }).where(eq(quotes.id, id));
      return created;
    });
    return order ? jsonOk(order, 201) : jsonError("Order was not created", 500);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
