import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categories } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { categorySchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, categorySchema.partial()); const [category] = await db.update(categories).set({ ...input, updatedAt: new Date() }).where(eq(categories.id, id)).returning(); return category ? jsonOk(category) : jsonError("Category not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [category] = await db.delete(categories).where(eq(categories.id, id)).returning(); return category ? jsonOk({ deleted: true, id }) : jsonError("Category not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
