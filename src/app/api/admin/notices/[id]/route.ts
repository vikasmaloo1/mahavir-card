import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { notices } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { noticeSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/notices/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [notice] = await db.select().from(notices).where(eq(notices.id, id)).limit(1);
    return notice ? jsonOk(notice) : jsonError("Notice not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/notices/[id]">) {
  try {
    const admin = await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, noticeSchema.partial());
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) return jsonError("End date must be after the start date", 422);
    const [notice] = await db.update(notices).set({ ...input, linkLabel: input.linkLabel || null, linkUrl: input.linkUrl || null, updatedBy: admin.user.id, updatedAt: new Date() }).where(eq(notices.id, id)).returning();
    return notice ? jsonOk(notice) : jsonError("Notice not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/notices/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [notice] = await db.delete(notices).where(eq(notices.id, id)).returning({ id: notices.id });
    return notice ? jsonOk({ deleted: true, id: notice.id }) : jsonError("Notice not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
