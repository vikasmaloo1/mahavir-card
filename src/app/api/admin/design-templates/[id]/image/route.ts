import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { designTemplates } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage, storageKeys, validateImageFile } from "@/lib/storage";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: templateId } = await ctx.params;
    const [existing] = await db.select({ id: designTemplates.id, storageKey: designTemplates.storageKey }).from(designTemplates).where(eq(designTemplates.id, templateId)).limit(1);
    if (!existing) return jsonError("Template not found", 404);

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("An image file is required", 422);
    await validateImageFile(file);

    const key = storageKeys.templateImage(templateId, file.name);
    const imageUrl = `/api/design-templates/${templateId}/image/file`;
    await storage.uploadObject({ key, body: new Uint8Array(await file.arrayBuffer()), contentType: file.type, contentLength: file.size, visibility: "PUBLIC", metadata: { resource: "design-template-image", templateId } });

    try {
      const [template] = await db.update(designTemplates).set({ imageUrl, storageKey: key, updatedAt: new Date() }).where(eq(designTemplates.id, templateId)).returning();
      if (existing.storageKey && existing.storageKey !== key) await storage.deleteObject(existing.storageKey).catch(() => undefined);
      return template ? jsonOk(template, 201) : jsonError("Template image was not saved", 500);
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
