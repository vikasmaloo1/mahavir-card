import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { validateRequiredArtwork } from "@/lib/artwork-validation";
import { getOwnedCart, selectionsFromConfiguration } from "@/lib/cart-service";
import { db } from "@/lib/db/server";
import { addresses, cartItems, customers, orderItems, orders, payments } from "@/lib/db/schema";
import { createPaymentIntent } from "@/lib/payment-service";
import { requireUser } from "@/lib/permissions";
import { checkoutSchema } from "@/lib/validation";

function makeNumber() {
  return `MHC-O-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, checkoutSchema);
    const basket = await getOwnedCart(session.user.id, "PURCHASE");
    if (!basket.id || !basket.items.length) return jsonError("Your purchase basket is empty", 422);
    if (basket.summary.hasUnavailableItems) return jsonError("One or more basket items must be updated before checkout", 422);

    for (const item of basket.items) {
      try {
        await validateRequiredArtwork(session.user.id, item.productId, item.configuration);
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Artwork validation failed", 422);
      }
    }

    const deliverySelections = basket.items.map((item) => selectionsFromConfiguration(item.configuration).delivery).filter(Boolean);
    const deliveryMethods = [...new Set(deliverySelections.map((delivery) => delivery!.method))];
    const deliveryStates = [...new Set(deliverySelections.map((delivery) => delivery!.stateCode).filter(Boolean))];
    const deliveryPrice = basket.items.reduce((sum, item) => sum + Number((item.pricingSnapshot as { delivery?: { price?: string } }).delivery?.price ?? 0), 0).toFixed(2);
    const tax = basket.items.reduce((sum, item) => sum + Number((item.pricingSnapshot as { taxAmount?: string }).taxAmount ?? 0), 0).toFixed(2);
    const total = basket.summary.total;
    const deliveryAddress = { ...input.address, line2: input.address.line2 || null, country: input.address.country || "India" };

    const result = await db.transaction(async (tx) => {
      const [existingCustomer] = await tx.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
      const customer = existingCustomer
        ? (await tx.update(customers).set({ ...input.customer, email: session.user.email, updatedAt: new Date() }).where(eq(customers.id, existingCustomer.id)).returning())[0]
        : (await tx.insert(customers).values({ ...input.customer, userId: session.user.id, email: session.user.email }).returning())[0];
      if (!customer) return null;

      const [defaultAddress] = await tx.select().from(addresses).where(and(eq(addresses.customerId, customer.id), eq(addresses.type, "DELIVERY"), eq(addresses.isDefault, true))).limit(1);
      if (defaultAddress) {
        await tx.update(addresses).set({ ...deliveryAddress, updatedAt: new Date() }).where(eq(addresses.id, defaultAddress.id));
      } else {
        await tx.insert(addresses).values({ customerId: customer.id, type: "DELIVERY", ...deliveryAddress, isDefault: true });
      }

      const [order] = await tx.insert(orders).values({
        orderNumber: makeNumber(),
        customerId: customer.id,
        subtotal: total,
        tax,
        total,
        deliveryMethod: deliveryMethods.length === 1 ? deliveryMethods[0] : deliveryMethods.length > 1 ? "MULTIPLE" : null,
        deliveryState: deliveryStates.length === 1 ? deliveryStates[0] : null,
        deliveryPrice,
        deliveryAddress,
        notes: "Created through customer checkout",
      }).returning();
      if (!order) return null;

      await tx.insert(orderItems).values(basket.items.map((item) => {
        const lineTotal = Number(item.calculatedAmount ?? 0);
        return {
          orderId: order.id,
          productId: item.productId,
          description: item.product.name,
          jobName: item.jobName,
          configuration: item.configuration,
          quantity: item.quantity,
          unitPrice: (lineTotal / item.quantity).toFixed(2),
          totalPrice: lineTotal.toFixed(2),
          pricingSnapshot: { ...(item.pricingSnapshot as Record<string, unknown>), product: { id: item.productId, name: item.product.name, slug: item.product.slug }, quantity: item.quantity, capturedAt: new Date().toISOString() },
        };
      }));

      const intent = createPaymentIntent(input.paymentMethod, total);
      const [payment] = await tx.insert(payments).values({ orderId: order.id, customerId: customer.id, method: input.paymentMethod, amount: total, status: intent.status, provider: intent.provider }).returning();
      await tx.delete(cartItems).where(eq(cartItems.cartId, basket.id!));
      return payment ? { order, payment } : null;
    });

    return result ? jsonOk(result, 201) : jsonError("Order was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
