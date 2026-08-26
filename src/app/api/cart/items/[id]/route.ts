import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { cartItems, carts } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { cartItemUpdateSchema } from "@/lib/validation";

async function ownedItem(id: string, userId: string) {
  const [item] = await db.select({ id: cartItems.id }).from(cartItems).innerJoin(carts, eq(cartItems.cartId, carts.id)).where(and(eq(cartItems.id, id), eq(carts.userId, userId))).limit(1);
  return item;
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/cart/items/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    if (!await ownedItem(id, session.user.id)) return jsonError("Basket item not found", 404);
    const input = await readBody(request, cartItemUpdateSchema);
    const [item] = await db.update(cartItems).set({ ...input, updatedAt: new Date() }).where(eq(cartItems.id, id)).returning();
    return item ? jsonOk(item) : jsonError("Basket item not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
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
