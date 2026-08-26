import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { pricingRules } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminPricingSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/pricing/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [rule] = await db.select().from(pricingRules).where(eq(pricingRules.id, id)).limit(1); return rule ? jsonOk(rule) : jsonError("Pricing rule not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/pricing/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, adminPricingSchema.partial()); const [rule] = await db.update(pricingRules).set({ ...input, updatedAt: new Date() }).where(eq(pricingRules.id, id)).returning(); return rule ? jsonOk(rule) : jsonError("Pricing rule not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/pricing/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [rule] = await db.update(pricingRules).set({ isActive: false, updatedAt: new Date() }).where(eq(pricingRules.id, id)).returning(); return rule ? jsonOk(rule) : jsonError("Pricing rule not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
