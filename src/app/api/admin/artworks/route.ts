import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orders, products, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const data = await db.select({ artwork: artworks, customerName: customers.contactName, productName: products.name, orderNumber: orders.orderNumber, quoteNumber: quotes.quoteNumber })
      .from(artworks)
      .leftJoin(customers, eq(artworks.customerId, customers.id))
      .leftJoin(products, eq(artworks.productId, products.id))
      .leftJoin(orders, eq(artworks.orderId, orders.id))
      .leftJoin(quotes, eq(artworks.quoteId, quotes.id))
      .orderBy(desc(artworks.createdAt));
    return jsonOk(data.map(({ artwork, ...context }) => ({ ...artwork, ...context })));
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
