import { and, desc, eq, inArray } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orderItems, orders } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { mapItemsWithArtworks } from "@/lib/order-artwork-mapping";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25)));
    const customerType = params.get("customerType");
    const conditions = customerType === "B2B" || customerType === "B2C" ? [eq(customers.customerType, customerType)] : [];
    const rows = await db
      .select({ order: orders, customerName: customers.contactName, customerType: customers.customerType })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const orderIds = rows.map((row) => row.order.id);
    const [artworkRows, orderItemRows] = orderIds.length
      ? await Promise.all([
          db
            .select({
              id: artworks.id,
              orderId: artworks.orderId,
              fileName: artworks.fileName,
              status: artworks.status,
              fileSize: artworks.fileSize,
              productId: artworks.productId,
            })
            .from(artworks)
            .where(inArray(artworks.orderId, orderIds)),
          db
            .select({
              id: orderItems.id,
              orderId: orderItems.orderId,
              productId: orderItems.productId,
              jobName: orderItems.jobName,
              description: orderItems.description,
              quantity: orderItems.quantity,
              unitPrice: orderItems.unitPrice,
              totalPrice: orderItems.totalPrice,
              configuration: orderItems.configuration,
            })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds)),
        ])
      : [[], []];

    const artworksByOrder = new Map<string, Array<{ id: string; fileName: string; status: string; fileSize: number | null; productId: string | null }>>();
    for (const art of artworkRows) {
      if (!art.orderId) continue;
      if (!artworksByOrder.has(art.orderId)) artworksByOrder.set(art.orderId, []);
      artworksByOrder.get(art.orderId)!.push(art);
    }

    const itemsByOrder = new Map<string, typeof orderItemRows>();
    for (const item of orderItemRows) {
      if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
      itemsByOrder.get(item.orderId)!.push(item);
    }

    const data = rows.map((row) => {
      const orderArtworks = artworksByOrder.get(row.order.id) ?? [];
      const orderItemList = itemsByOrder.get(row.order.id) ?? [];
      const { mappedItems, unmappedArtworks } = mapItemsWithArtworks(orderItemList, orderArtworks);
      const jobNames = orderItemList.map((item) => item.jobName || item.description).filter(Boolean);

      return {
        ...row.order,
        customerName: row.customerName,
        customerType: row.customerType,
        artworkCount: orderArtworks.length,
        artworks: orderArtworks,
        items: mappedItems,
        unmappedArtworks,
        firstArtworkId: orderArtworks[0]?.id ?? null,
        jobName: jobNames.join(", ") || null,
        jobNames,
      };
    });
    return jsonOk({ items: data, page, limit });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
