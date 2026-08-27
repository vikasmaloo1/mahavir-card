import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orderItems, orders, payments, storedDocuments } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminOrderUpdateSchema } from "@/lib/validation";
import { canTransition } from "@/lib/workflows";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);
    const [items, payment, artworkRows, documents, customer] = await Promise.all([
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(payments).where(eq(payments.orderId, id)).limit(1),
      db.select().from(artworks).where(eq(artworks.orderId, id)),
      db.select().from(storedDocuments).where(eq(storedDocuments.orderId, id)),
      order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1) : Promise.resolve([]),
    ]);
    return jsonOk({ order, items, payment: payment[0] ?? null, artworks: artworkRows, documents, customer: customer[0] ?? null });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, adminOrderUpdateSchema); const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1); if (!existing) return jsonError("Order not found", 404); if (input.status && !canTransition("order", existing.status, input.status)) return jsonError(`Cannot move an order from ${existing.status} to ${input.status}`, 409); const [order] = await db.update(orders).set({ ...input, updatedAt: new Date() }).where(eq(orders.id, id)).returning(); return order ? jsonOk(order) : jsonError("Order not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
