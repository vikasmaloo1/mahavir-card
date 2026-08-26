import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { payments } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/payments/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [payment] = await db.select().from(payments).where(eq(payments.id, id)).limit(1); return payment ? jsonOk(payment) : jsonError("Payment not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
