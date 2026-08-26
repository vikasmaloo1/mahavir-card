import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { storedDocuments } from "@/lib/db/schema";
import { authorizeDocument } from "@/lib/document-storage";
import { requireUser } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/invoices/[id]/download">) {
  try { await requireUser(request); const { id } = await ctx.params; const [document] = await db.select().from(storedDocuments).where(and(eq(storedDocuments.id, id), eq(storedDocuments.documentType, "INVOICE"), eq(storedDocuments.status, "AVAILABLE"))).limit(1); if (!document) return jsonError("Invoice not found", 404); await authorizeDocument(request, document); return Response.redirect(await storage.getSignedDownloadUrl({ key: document.storageKey, filename: document.originalFilename, contentType: "application/pdf", disposition: "attachment", expiresIn: 600 }), 302); } catch (error) { if (error instanceof Response) return error; if (error instanceof StorageConfigurationError) return jsonError(error.message, 503); return handleApiError(error); }
}
