import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addons } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { addonSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/addons/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [addon] = await db.select().from(addons).where(eq(addons.id, id)).limit(1);
    return addon ? jsonOk(addon) : jsonError("Add-on not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/addons/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, addonSchema.partial());
    const [addon] = await db.update(addons).set({ ...input, updatedAt: new Date() }).where(eq(addons.id, id)).returning();
    return addon ? jsonOk(addon) : jsonError("Add-on not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/addons/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [addon] = await db.update(addons).set({ isActive: false, updatedAt: new Date() }).where(eq(addons.id, id)).returning();
    return addon ? jsonOk(addon) : jsonError("Add-on not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
