import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { inquiries, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/inquiries/[id]/convert-to-quote">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, id)).limit(1); if (!inquiry) return jsonError("Inquiry not found", 404); const result = await db.transaction(async (tx) => { const [quote] = await tx.insert(quotes).values({ quoteNumber: `MHC-Q-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, customerId: inquiry.customerId, contactName: inquiry.contactName, email: inquiry.email, phone: inquiry.phone, companyName: inquiry.companyName, notes: inquiry.message, status: "REVIEWING" }).returning(); await tx.update(inquiries).set({ status: "CONVERTED", updatedAt: new Date() }).where(eq(inquiries.id, id)); return quote; }); return result ? jsonOk(result, 201) : jsonError("Quote was not created", 500); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
