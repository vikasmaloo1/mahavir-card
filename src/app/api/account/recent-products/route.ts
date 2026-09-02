import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orderItems, orders, products } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";

/**
 * Distinct products the customer has ordered before, most recently first —
 * powers the "Recently ordered" row on Order Now so a repeat buyer doesn't
 * have to re-browse the catalogue for something they've bought already.
 * De-duplicated in JS rather than SQL DISTINCT ON to keep this simple; the
 * lookback window (last 50 order lines) is generous enough for any real
 * customer's order history.
 */
export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonOk({ items: [] });

    const rows = await db
      .select({
        orderId: orders.id,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        configuration: orderItems.configuration,
        createdAt: orders.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productImageUrl: products.imageUrl,
        productOrderable: products.orderable,
        productIsActive: products.isActive,
        productStatus: products.status,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orders.customerId, customer.id))
      .orderBy(desc(orders.createdAt))
      .limit(50);

    const seen = new Set<string>();
    const items = [];
    for (const row of rows) {
      if (!row.productId || seen.has(row.productId)) continue;
      if (!row.productIsActive || row.productStatus !== "ACTIVE" || !row.productOrderable) continue;
      seen.add(row.productId);
      items.push({
        orderId: row.orderId,
        productId: row.productId,
        name: row.productName,
        slug: row.productSlug,
        imageUrl: row.productImageUrl,
        quantity: row.quantity,
        configuration: row.configuration,
        lastOrderedAt: row.createdAt,
      });
      if (items.length >= 5) break;
    }

    return jsonOk({ items });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
