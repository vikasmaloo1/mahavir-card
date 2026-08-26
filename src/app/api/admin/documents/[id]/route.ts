import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { storedDocuments } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/documents/[id]">) {
  try {
    await requireAdmin(request);
    const { id } = await ctx.params;
    const [document] = await db.select().from(storedDocuments).where(eq(storedDocuments.id, id)).limit(1);
    if (!document) return jsonError("Document not found", 404);
    await storage.deleteObject(document.storageKey);
    await db.delete(storedDocuments).where(eq(storedDocuments.id, id));
    return jsonOk({ deleted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
