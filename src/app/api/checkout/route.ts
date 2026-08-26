import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orderItems, orders, payments, products } from "@/lib/db/schema";
import { createPaymentIntent } from "@/lib/payment-service";
import { requireUser } from "@/lib/permissions";
import { calculateProductPrice } from "@/lib/pricing-service";
import { checkoutSchema } from "@/lib/validation";

function makeNumber() {
  return `MHC-O-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, checkoutSchema);
    const pricedItems = await Promise.all(input.items.map(async (item) => {
      const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
      if (!product?.isActive || !product.orderable) return null;
      const price = await calculateProductPrice(item.productId, item.quantity, item.configuration);
      if (!price?.calculatedAmount || price.warnings.length > 0) return null;
      return { product, item, price };
    }));
    if (pricedItems.some((item) => !item)) return jsonError("One or more products are not available for direct checkout at this configuration", 422);
    const completeItems = pricedItems.filter((item): item is NonNullable<typeof item> => Boolean(item));
    const total = completeItems.reduce((sum, item) => sum + Number(item.price.calculatedAmount), 0).toFixed(2);

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
      const customer = existing ? (await tx.update(customers).set({ ...input.customer, email: session.user.email, updatedAt: new Date() }).where(eq(customers.id, existing.id)).returning())[0] : (await tx.insert(customers).values({ ...input.customer, userId: session.user.id, email: session.user.email }).returning())[0];
      if (!customer) return null;
      const [order] = await tx.insert(orders).values({ orderNumber: makeNumber(), customerId: customer.id, subtotal: total, total, notes: "Created through customer checkout" }).returning();
      if (!order) return null;
      await tx.insert(orderItems).values(completeItems.map(({ product, item, price }) => ({ orderId: order.id, productId: product.id, description: product.name, configuration: item.configuration, quantity: item.quantity, unitPrice: price.calculatedAmount!, totalPrice: price.calculatedAmount! })));
      const intent = createPaymentIntent(input.paymentMethod, total);
      const [payment] = await tx.insert(payments).values({ orderId: order.id, customerId: customer.id, method: input.paymentMethod, amount: total, status: intent.status, provider: intent.provider }).returning();
      return { order, payment };
    });
    return result ? jsonOk(result, 201) : jsonError("Order was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
