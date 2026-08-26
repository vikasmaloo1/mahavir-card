import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { products } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { productSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, productSchema.partial()); const [product] = await db.update(products).set({ ...input, updatedAt: new Date() }).where(eq(products.id, id)).returning(); return product ? jsonOk(product) : jsonError("Product not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [product] = await db.update(products).set({ isActive: false, updatedAt: new Date() }).where(eq(products.id, id)).returning(); return product ? jsonOk(product) : jsonError("Product not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
