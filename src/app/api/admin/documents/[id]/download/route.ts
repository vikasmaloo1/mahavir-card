import { eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { storedDocuments } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/documents/[id]/download">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const [document] = await db.select().from(storedDocuments).where(eq(storedDocuments.id, id)).limit(1); if (!document) return jsonError("Document not found", 404); return Response.redirect(await storage.getSignedDownloadUrl({ key: document.storageKey, filename: document.originalFilename, contentType: document.contentType, disposition: "attachment", expiresIn: 600 }), 302); } catch (error) { if (error instanceof Response) return error; if (error instanceof StorageConfigurationError) return jsonError(error.message, 503); return handleApiError(error); }
}
