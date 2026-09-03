import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { designTemplates } from "@/lib/db/schema";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const [template] = await db.select({ storageKey: designTemplates.storageKey, title: designTemplates.title }).from(designTemplates).where(and(eq(designTemplates.id, id), eq(designTemplates.isActive, true))).limit(1);
    if (!template?.storageKey) return jsonError("Template image not found", 404);
    const url = await storage.getSignedDownloadUrl({ key: template.storageKey, filename: template.title, disposition: "inline", expiresIn: 900 });
    return Response.redirect(url, 302);
  } catch (error) {
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
