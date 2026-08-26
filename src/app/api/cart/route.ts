import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { cartItems, carts, products } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { cartKindSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const parsed = cartKindSchema.safeParse(new URL(request.url).searchParams.get("kind") ?? "PURCHASE");
    if (!parsed.success) return jsonError("Invalid basket type", 422);
    const [cart] = await db.select().from(carts).where(and(eq(carts.userId, session.user.id), eq(carts.kind, parsed.data))).limit(1);
    if (!cart) return jsonOk({ kind: parsed.data, items: [] });
    const items = await db.select({ id: cartItems.id, productId: cartItems.productId, quantity: cartItems.quantity, configuration: cartItems.configuration, product: { name: products.name, slug: products.slug, orderable: products.orderable, quoteable: products.quoteable } }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.createdAt));
    return jsonOk({ id: cart.id, kind: cart.kind, items });
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
