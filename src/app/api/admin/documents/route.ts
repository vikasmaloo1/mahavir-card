import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { orders, quotes, storedDocuments } from "@/lib/db/schema";
import { storeGeneratedDocument } from "@/lib/document-storage";
import { requireAdmin } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, validatePdfFile } from "@/lib/storage";

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value.trim() : ""; }

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const documents = await db.select({ id: storedDocuments.id, documentType: storedDocuments.documentType, entityType: storedDocuments.entityType, entityId: storedDocuments.entityId, originalFilename: storedDocuments.originalFilename, contentType: storedDocuments.contentType, fileSize: storedDocuments.fileSize, status: storedDocuments.status, customerId: storedDocuments.customerId, quoteId: storedDocuments.quoteId, orderId: storedDocuments.orderId, createdAt: storedDocuments.createdAt }).from(storedDocuments).orderBy(desc(storedDocuments.createdAt));
    return jsonOk(documents);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { session } = await requireAdmin(request);
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return jsonError("A PDF document is required", 422);
    await validatePdfFile(file);
    const documentType = text(form, "documentType").toUpperCase(); const entityType = text(form, "entityType").toUpperCase(); const entityId = text(form, "entityId");
    if (!['INVOICE', 'QUOTE', 'OTHER'].includes(documentType) || !/^[0-9a-f-]{36}$/i.test(entityId)) return jsonError("Valid document type and entity ID are required", 422);
    let customerId: string | null = null; let quoteId: string | null = null; let orderId: string | null = null;
    if (documentType === "QUOTE") { quoteId = text(form, "quoteId") || entityId; const [quote] = await db.select({ id: quotes.id, customerId: quotes.customerId }).from(quotes).where(eq(quotes.id, quoteId)).limit(1); if (!quote) return jsonError("Quote not found", 404); customerId = quote.customerId; }
    if (documentType === "INVOICE") { orderId = text(form, "orderId"); if (!orderId) return jsonError("An invoice document must be associated with an order", 422); const [order] = await db.select({ id: orders.id, customerId: orders.customerId }).from(orders).where(eq(orders.id, orderId)).limit(1); if (!order) return jsonError("Order not found", 404); customerId = order.customerId; }
    const document = await storeGeneratedDocument({ documentType: documentType as "INVOICE" | "QUOTE" | "OTHER", entityType: entityType || documentType, entityId, customerId, quoteId, orderId, filename: file.name, contentType: file.type, bytes: new Uint8Array(await file.arrayBuffer()), createdBy: session.user.id });
    return jsonOk({ id: document.id, documentType: document.documentType, filename: document.originalFilename, fileSize: document.fileSize, status: document.status }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
