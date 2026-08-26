import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { orderItems, orders } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminOrderUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1); if (!order) return jsonError("Order not found", 404); const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id)); return jsonOk({ order, items }); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/orders/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, adminOrderUpdateSchema); const [order] = await db.update(orders).set({ ...input, updatedAt: new Date() }).where(eq(orders.id, id)).returning(); return order ? jsonOk(order) : jsonError("Order not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
