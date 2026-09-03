import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { designTemplates } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { documentMaxBytes, FilePolicyError, StorageConfigurationError, storage, storageKeys } from "@/lib/storage";

/**
 * Optional downloadable editable source file (AI/PSD/CDR/etc) for a template —
 * only upload this if the license covers redistributing the editable source,
 * not just the preview image. Admin-only, so no format restriction beyond size.
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: templateId } = await ctx.params;
    const [existing] = await db.select({ id: designTemplates.id, sourceFileStorageKey: designTemplates.sourceFileStorageKey }).from(designTemplates).where(eq(designTemplates.id, templateId)).limit(1);
    if (!existing) return jsonError("Template not found", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("A file is required", 422);
    if (file.size <= 0 || file.size > documentMaxBytes()) throw new FilePolicyError(`File must be smaller than ${Math.ceil(documentMaxBytes() / 1024 / 1024)} MB.`);

    const key = storageKeys.templateSourceFile(templateId, file.name);
    const sourceFileUrl = `/api/design-templates/${templateId}/download`;
    await storage.uploadObject({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type || "application/octet-stream", contentLength: file.size, visibility: "PRIVATE", metadata: { resource: "design-template-source", templateId } });

    try {
      const [template] = await db.update(designTemplates).set({ sourceFileUrl, sourceFileStorageKey: key, updatedAt: new Date() }).where(eq(designTemplates.id, templateId)).returning();
      if (existing.sourceFileStorageKey && existing.sourceFileStorageKey !== key) await storage.deleteObject(existing.sourceFileStorageKey).catch(() => undefined);
      return template ? jsonOk(template, 201) : jsonError("Source file was not saved", 500);
    } catch (error) {
      await storage.deleteObject(key).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
