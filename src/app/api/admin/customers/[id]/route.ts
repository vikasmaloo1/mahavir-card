import { eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const customerUpdateSchema = z.object({ companyName: z.string().trim().min(2).max(160).optional(), contactName: z.string().trim().min(2).max(120).optional(), phone: z.string().trim().max(30).optional(), gstNumber: z.string().trim().max(30).nullable().optional(), status: z.enum(["ACTIVE", "INACTIVE"]).optional() });

export async function GET(request: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1); return customer ? jsonOk(customer) : jsonError("Customer not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, customerUpdateSchema); const [customer] = await db.update(customers).set({ ...input, updatedAt: new Date() }).where(eq(customers.id, id)).returning(); return customer ? jsonOk(customer) : jsonError("Customer not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
