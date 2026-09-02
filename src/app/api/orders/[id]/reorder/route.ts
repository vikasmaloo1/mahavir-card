import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { calculateCartSelection } from "@/lib/cart-service";
import { db } from "@/lib/db/server";
import { cartItems, carts, customers, orderItems, orders, products } from "@/lib/db/schema";
import { normalizeProductQuantity } from "@/lib/quantity-helper";
import { requireUser } from "@/lib/permissions";

/**
 * Restores every item from a past order into the customer's PURCHASE basket,
 * re-running live pricing (never trusting the historical stored price) so
 * rate/GST changes since the original order are reflected before payment.
 * Discontinued/deactivated products are skipped rather than blocking the
 * whole reorder; artwork references carry over as-is (exact product +
 * configuration match) and are re-validated the normal way at checkout.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;

    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonError("Complete your customer profile before reordering", 422);

    const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.customerId, customer.id))).limit(1);
    if (!order) return jsonError("Order not found", 404);

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    if (!items.length) return jsonError("This order has no items to reorder", 422);

    await db.insert(carts).values({ userId: session.user.id, kind: "PURCHASE" }).onConflictDoNothing();
    const [cart] = await db.select().from(carts).where(and(eq(carts.userId, session.user.id), eq(carts.kind, "PURCHASE"))).limit(1);
    if (!cart) return jsonError("Basket could not be prepared", 500);

    let addedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      if (!item.productId) { skippedCount += 1; continue; }
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!product?.isActive || product.status !== "ACTIVE" || !product.orderable) { skippedCount += 1; continue; }

      const { normalizedQuantity } = normalizeProductQuantity(item.quantity, null, product.slug);
      const configuration = { ...(item.configuration as Record<string, unknown> ?? {}), quantity: String(normalizedQuantity) };
      const price = await calculateCartSelection(item.productId, normalizedQuantity, configuration, session.user.id);

      await db.insert(cartItems).values({
        cartId: cart.id,
        productId: item.productId,
        quantity: normalizedQuantity,
        jobName: item.jobName,
        configuration,
        calculatedAmount: price?.calculatedAmount ?? null,
        pricingSnapshot: price ?? {},
      });
      addedCount += 1;
    }

    if (!addedCount) return jsonError("None of the items in this order are available to reorder", 422);
    return jsonOk({ addedCount, skippedCount }, 201);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
