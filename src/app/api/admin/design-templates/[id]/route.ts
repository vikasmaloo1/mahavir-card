import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { designTemplates } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { designTemplateUpdateSchema } from "@/lib/validation";
import { storage } from "@/lib/storage";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [template] = await db.select().from(designTemplates).where(eq(designTemplates.id, id)).limit(1);
    return template ? jsonOk(template) : jsonError("Template not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, designTemplateUpdateSchema);
    const [template] = await db.update(designTemplates).set({ ...input, updatedAt: new Date() }).where(eq(designTemplates.id, id)).returning();
    return template ? jsonOk(template) : jsonError("Template not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [existing] = await db.select({ storageKey: designTemplates.storageKey, sourceFileStorageKey: designTemplates.sourceFileStorageKey }).from(designTemplates).where(eq(designTemplates.id, id)).limit(1);
    if (!existing) return jsonError("Template not found", 404);
    await db.delete(designTemplates).where(eq(designTemplates.id, id));
    if (existing.storageKey) await storage.deleteObject(existing.storageKey).catch(() => undefined);
    if (existing.sourceFileStorageKey) await storage.deleteObject(existing.sourceFileStorageKey).catch(() => undefined);
    return jsonOk({ deleted: true, id });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
