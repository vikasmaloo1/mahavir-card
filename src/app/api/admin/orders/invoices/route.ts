import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, orderItems, orders } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const PRODUCTION_AND_DELIVERED_STATUSES = [
  "IN_PRODUCTION",
  "PRODUCTION",
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
  "COMPLETED",
];

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const customerType = searchParams.get("customerType")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    // Filter to production or delivered statuses
    if (status && PRODUCTION_AND_DELIVERED_STATUSES.includes(status.toUpperCase())) {
      conditions.push(eq(orders.status, status.toUpperCase()));
    } else {
      conditions.push(inArray(orders.status, PRODUCTION_AND_DELIVERED_STATUSES));
    }

    if (customerType === "B2B" || customerType === "B2C") {
      conditions.push(eq(customers.customerType, customerType));
    }

    if (query) {
      conditions.push(
        or(
          ilike(orders.orderNumber, `%${query}%`),
          ilike(orders.invoiceNumber, `%${query}%`),
          ilike(orders.chalanNumber, `%${query}%`),
          ilike(customers.contactName, `%${query}%`),
          ilike(customers.companyName, `%${query}%`),
          ilike(customers.phone, `%${query}%`),
          ilike(customers.gstNumber, `%${query}%`)
        )
      );
    }

    const whereClause = and(...conditions);

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          status: orders.status,
          invoiceNumber: orders.invoiceNumber,
          invoiceYear: orders.invoiceYear,
          invoiceSequence: orders.invoiceSequence,
          invoiceDate: orders.invoiceDate,
          chalanNumber: orders.chalanNumber,
          chalanDate: orders.chalanDate,
          total: orders.total,
          tax: orders.tax,
          taxType: orders.taxType,
          createdAt: orders.createdAt,
          customer: {
            id: customers.id,
            contactName: customers.contactName,
            companyName: customers.companyName,
            phone: customers.phone,
            gstNumber: customers.gstNumber,
            customerType: customers.customerType,
            city: customers.city,
            state: customers.state,
          },
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(whereClause)
        .orderBy(desc(orders.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(whereClause),
    ]);

    const orderIds = rows.map((r) => r.id);
    const items = orderIds.length
      ? await db
          .select({
            orderId: orderItems.orderId,
            description: orderItems.description,
            jobName: orderItems.jobName,
            quantity: orderItems.quantity,
            totalPrice: orderItems.totalPrice,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
      : [];

    const itemsByOrderId = new Map<string, typeof items>();
    for (const it of items) {
      if (!itemsByOrderId.has(it.orderId)) itemsByOrderId.set(it.orderId, []);
      itemsByOrderId.get(it.orderId)!.push(it);
    }

    const data = rows.map((row) => ({
      ...row,
      items: itemsByOrderId.get(row.id) || [],
    }));

    const total = totalResult[0]?.count ?? 0;

    return jsonOk({
      orders: data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
