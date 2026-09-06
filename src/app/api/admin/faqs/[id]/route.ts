import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { faqs } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { faqSchema } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/faqs/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, faqSchema.partial());
    const [faq] = await db.update(faqs).set({ ...input, updatedAt: new Date() }).where(eq(faqs.id, id)).returning();
    return faq ? jsonOk(faq) : jsonError("FAQ not found", 404);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/faqs/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [deleted] = await db.delete(faqs).where(eq(faqs.id, id)).returning({ id: faqs.id });
    return deleted ? jsonOk({ id: deleted.id }) : jsonError("FAQ not found", 404);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
