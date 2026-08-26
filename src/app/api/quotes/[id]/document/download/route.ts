import { and, desc, eq } from "drizzle-orm";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { storedDocuments } from "@/lib/db/schema";
import { authorizeDocument } from "@/lib/document-storage";
import { requireUser } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request, ctx: RouteContext<"/api/quotes/[id]/document/download">) {
  try { await requireUser(request); const { id: quoteId } = await ctx.params; const [document] = await db.select().from(storedDocuments).where(and(eq(storedDocuments.quoteId, quoteId), eq(storedDocuments.documentType, "QUOTE"), eq(storedDocuments.status, "AVAILABLE"))).orderBy(desc(storedDocuments.createdAt)).limit(1); if (!document) return jsonError("Quotation document not found", 404); await authorizeDocument(request, document); return Response.redirect(await storage.getSignedDownloadUrl({ key: document.storageKey, filename: document.originalFilename, contentType: "application/pdf", disposition: "attachment", expiresIn: 600 }), 302); } catch (error) { if (error instanceof Response) return error; if (error instanceof StorageConfigurationError) return jsonError(error.message, 503); return handleApiError(error); }
}
