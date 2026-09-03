import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { designTemplates } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireUser(request);
    const { id } = await ctx.params;
    const [template] = await db.select({ sourceFileStorageKey: designTemplates.sourceFileStorageKey, title: designTemplates.title }).from(designTemplates).where(and(eq(designTemplates.id, id), eq(designTemplates.isActive, true))).limit(1);
    if (!template?.sourceFileStorageKey) return jsonError("No downloadable source file for this template", 404);
    const url = await storage.getSignedDownloadUrl({ key: template.sourceFileStorageKey, filename: template.title, disposition: "attachment", expiresIn: 300 });
    return Response.redirect(url, 302);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
