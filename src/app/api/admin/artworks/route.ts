import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orders, products, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const data = await db.select({ artwork: artworks, customerName: customers.contactName, productName: products.name, orderNumber: orders.orderNumber, quoteNumber: quotes.quoteNumber })
      .from(artworks)
      .leftJoin(customers, eq(artworks.customerId, customers.id))
      .leftJoin(products, eq(artworks.productId, products.id))
      .leftJoin(orders, eq(artworks.orderId, orders.id))
      .leftJoin(quotes, eq(artworks.quoteId, quotes.id))
      .orderBy(desc(artworks.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
    const items = data.map(({ artwork, ...context }) => ({ ...artwork, ...context }));
    return jsonOk({ items, page, limit });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
