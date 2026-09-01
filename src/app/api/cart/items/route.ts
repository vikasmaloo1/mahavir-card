import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { cartItems, carts, products } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { cartItemSchema } from "@/lib/validation";
import { validateRequiredArtwork } from "@/lib/artwork-validation";
import { calculateCartSelection, purchasablePrice } from "@/lib/cart-service";
import { normalizeProductQuantity } from "@/lib/quantity-helper";
import { PricingValidationError } from "@/lib/pricing-service";

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, cartItemSchema);
    const [product] = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
    if (!product?.isActive) return jsonError("Product is not available", 422);
    if (input.kind === "PURCHASE" && !product.orderable) return jsonError("This product is available only for quotes", 422);
    if (input.kind === "QUOTE" && !product.quoteable) return jsonError("This product is available only for direct ordering", 422);
    const { normalizedQuantity } = normalizeProductQuantity(input.quantity, null, product.slug);
    const quantity = normalizedQuantity;
    if (input.kind === "PURCHASE") {
      try {
        await validateRequiredArtwork(session.user.id, input.productId, input.configuration);
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Artwork validation failed", 422);
      }
    }
    const price = await calculateCartSelection(input.productId, quantity, input.configuration, session.user.id);
    if (input.kind === "PURCHASE" && !purchasablePrice(price)) return jsonError(price?.warnings[0] ?? "This configuration does not have an exact direct-purchase price", 422);
    await db.insert(carts).values({ userId: session.user.id, kind: input.kind }).onConflictDoNothing();
    const [cart] = await db.select().from(carts).where(and(eq(carts.userId, session.user.id), eq(carts.kind, input.kind))).limit(1);
    if (!cart) return jsonError("Basket was not created", 500);

    const existingItems = await db.select().from(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.productId, input.productId)));
    const existing = input.kind === "QUOTE" ? existingItems[0] : existingItems.find((it) => JSON.stringify(it.configuration) === JSON.stringify(input.configuration));

    if (existing) {
      const combinedQuantity = existing.quantity + quantity;
      const { normalizedQuantity: finalQuantity } = normalizeProductQuantity(combinedQuantity, null, product.slug);
      const updatedPrice = await calculateCartSelection(input.productId, finalQuantity, input.configuration, session.user.id);
      const [updatedItem] = await db.update(cartItems).set({
        quantity: finalQuantity,
        jobName: input.jobName ?? existing.jobName,
        configuration: { ...(existing.configuration as object || {}), ...(input.configuration || {}), quantity: String(finalQuantity) },
        calculatedAmount: updatedPrice?.calculatedAmount ?? null,
        pricingSnapshot: updatedPrice ?? {},
        updatedAt: new Date(),
      }).where(eq(cartItems.id, existing.id)).returning();
      return updatedItem ? jsonOk(updatedItem, 200) : jsonError("Basket item was not updated", 500);
    }

    const [item] = await db.insert(cartItems).values({ cartId: cart.id, productId: input.productId, quantity, jobName: input.jobName ?? null, configuration: input.configuration, calculatedAmount: price?.calculatedAmount ?? null, pricingSnapshot: price ?? {} }).returning();
    return item ? jsonOk(item, 201) : jsonError("Basket item was not created", 500);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof PricingValidationError) return jsonError(error.message, 422);
    return handleApiError(error);
  }
}
