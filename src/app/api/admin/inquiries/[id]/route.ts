import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { inquiries } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { z } from "zod";

const inquiryUpdateSchema = z.object({ status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "QUOTATION_REQUESTED", "CONVERTED", "CLOSED", "LOST"]).optional(), message: z.string().trim().min(5).max(3000).optional() });

export async function GET(request: Request, ctx: RouteContext<"/api/admin/inquiries/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1); return inquiry ? jsonOk(inquiry) : jsonError("Inquiry not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/inquiries/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, inquiryUpdateSchema); const [inquiry] = await db.update(inquiries).set({ ...input, updatedAt: new Date() }).where(eq(inquiries.id, id)).returning(); return inquiry ? jsonOk(inquiry) : jsonError("Inquiry not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
