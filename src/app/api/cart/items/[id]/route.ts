import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { cartItems, carts, products } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { cartItemUpdateSchema } from "@/lib/validation";
import { validateRequiredArtwork } from "@/lib/artwork-validation";
import { calculateCartSelection, purchasablePrice } from "@/lib/cart-service";
import { PricingValidationError } from "@/lib/pricing-service";

async function ownedItem(id: string, userId: string) {
  const [item] = await db.select({ id: cartItems.id, productId: cartItems.productId, quantity: cartItems.quantity, configuration: cartItems.configuration, kind: carts.kind, product: products }).from(cartItems).innerJoin(carts, eq(cartItems.cartId, carts.id)).innerJoin(products, eq(cartItems.productId, products.id)).where(and(eq(cartItems.id, id), eq(carts.userId, userId))).limit(1);
  return item;
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/cart/items/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    const existing = await ownedItem(id, session.user.id);
    if (!existing) return jsonError("Basket item not found", 404);
    const input = await readBody(request, cartItemUpdateSchema);
    const quantity = input.quantity;
    const configuration = input.configuration ?? existing.configuration;
    const capable = existing.product.isActive && existing.product.status === "ACTIVE" && (existing.kind === "PURCHASE" ? existing.product.orderable : existing.product.quoteable);
    if (!capable) return jsonError("This product is no longer available for this basket", 422);
    try { await validateRequiredArtwork(session.user.id, existing.productId, configuration); } catch (error) { return jsonError(error instanceof Error ? error.message : "Artwork validation failed", 422); }
    const price = await calculateCartSelection(existing.productId, quantity, configuration, session.user.id);
    if (existing.kind === "PURCHASE" && !purchasablePrice(price)) return jsonError(price?.warnings[0] ?? "This configuration does not have an exact direct-purchase price", 422);
    const [item] = await db.update(cartItems).set({ quantity, jobName: input.jobName, configuration, calculatedAmount: price?.calculatedAmount ?? null, pricingSnapshot: price ?? {}, updatedAt: new Date() }).where(eq(cartItems.id, id)).returning();
    return item ? jsonOk(item) : jsonError("Basket item not found", 404);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof PricingValidationError) return jsonError(error.message, 422);
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/cart/items/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    if (!await ownedItem(id, session.user.id)) return jsonError("Basket item not found", 404);
    await db.delete(cartItems).where(eq(cartItems.id, id));
    return jsonOk({ deleted: true, id });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
