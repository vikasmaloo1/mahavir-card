import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { payments } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminPaymentUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/payments/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1); return payment ? jsonOk(payment) : jsonError("Payment not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/payments/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, adminPaymentUpdateSchema);
    const [payment] = await db.update(payments).set(input).where(eq(payments.id, id)).returning();
    return payment ? jsonOk(payment) : jsonError("Payment not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
