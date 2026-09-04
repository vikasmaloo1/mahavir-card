import { and, count, desc, eq, inArray } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orderItems, orders } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

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
    const [artworkCounts, jobNameRows] = orderIds.length
      ? await Promise.all([
          db.select({ orderId: artworks.orderId, count: count() }).from(artworks).where(inArray(artworks.orderId, orderIds)).groupBy(artworks.orderId),
          db.select({ orderId: orderItems.orderId, jobName: orderItems.jobName, description: orderItems.description }).from(orderItems).where(inArray(orderItems.orderId, orderIds)),
        ])
      : [[], []];
    const artworkCountByOrder = new Map(artworkCounts.map((row) => [row.orderId, row.count]));
    const jobNameByOrder = new Map<string, string>();
    for (const item of jobNameRows) {
      if (!jobNameByOrder.has(item.orderId)) jobNameByOrder.set(item.orderId, item.jobName || item.description);
    }

    const data = rows.map((row) => ({
      ...row.order,
      customerName: row.customerName,
      customerType: row.customerType,
      artworkCount: artworkCountByOrder.get(row.order.id) ?? 0,
      jobName: jobNameByOrder.get(row.order.id) ?? null,
    }));
    return jsonOk({ items: data, page, limit });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
