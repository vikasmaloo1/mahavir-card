import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { cartItems, carts } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { cartKindSchema } from "@/lib/validation";
import { getOwnedCart } from "@/lib/cart-service";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const url = new URL(request.url);
    const parsed = cartKindSchema.safeParse(url.searchParams.get("kind") ?? "PURCHASE");
    if (!parsed.success) return jsonError("Invalid basket type", 422);
    const stateCode = url.searchParams.get("stateCode")?.trim() || undefined;
    return jsonOk(await getOwnedCart(session.user.id, parsed.data, stateCode));
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireUser(request);
    const parsed = cartKindSchema.safeParse(new URL(request.url).searchParams.get("kind") ?? "PURCHASE");
    if (!parsed.success) return jsonError("Invalid basket type", 422);
    const [cart] = await db.select({ id: carts.id }).from(carts).where(and(eq(carts.userId, session.user.id), eq(carts.kind, parsed.data))).limit(1);
    if (cart) await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    return jsonOk({ cleared: true });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
