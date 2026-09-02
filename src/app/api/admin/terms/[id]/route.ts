import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { terms } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { termSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/terms/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [term] = await db.select().from(terms).where(eq(terms.id, id)).limit(1);
    return term ? jsonOk(term) : jsonError("Term not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/terms/[id]">) {
  try {
    const admin = await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, termSchema.partial());
    const [term] = await db.update(terms).set({
      ...input,
      titleGu: input.titleGu !== undefined ? (input.titleGu || null) : undefined,
      titleHi: input.titleHi !== undefined ? (input.titleHi || null) : undefined,
      contentGu: input.contentGu !== undefined ? (input.contentGu || null) : undefined,
      contentHi: input.contentHi !== undefined ? (input.contentHi || null) : undefined,
      updatedBy: admin.user.id,
      updatedAt: new Date(),
    }).where(eq(terms.id, id)).returning();
    return term ? jsonOk(term) : jsonError("Term not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/terms/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [term] = await db.delete(terms).where(eq(terms.id, id)).returning({ id: terms.id });
    return term ? jsonOk({ deleted: true, id: term.id }) : jsonError("Term not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
