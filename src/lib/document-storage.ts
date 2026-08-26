import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { customers, orders, quotes, storedDocuments } from "@/lib/db/schema";
import { getAdminAccess, requireUser } from "@/lib/permissions";
import { storage, storageKeys, validatePdfBytes } from "@/lib/storage";

type DocumentType = "INVOICE" | "QUOTE" | "OTHER";

export type StoreDocumentInput = {
  documentType: DocumentType;
  entityType: string;
  entityId: string;
  customerId?: string | null;
  quoteId?: string | null;
  orderId?: string | null;
  filename: string;
  contentType?: string;
  bytes: Uint8Array;
  createdBy?: string | null;
};

export function publicDocument(document: typeof storedDocuments.$inferSelect) {
  return { id: document.id, documentType: document.documentType, entityType: document.entityType, entityId: document.entityId, filename: document.originalFilename, contentType: document.contentType, fileSize: document.fileSize, status: document.status, createdAt: document.createdAt.toISOString() };
}

export async function storeGeneratedDocument(input: StoreDocumentInput) {
  const contentType = input.contentType ?? "application/pdf";
  validatePdfBytes(input.bytes, input.filename, contentType);
  const key = input.documentType === "QUOTE" && input.quoteId
    ? storageKeys.quote(input.quoteId, input.filename)
    : input.documentType === "INVOICE" && input.customerId
      ? storageKeys.invoice(input.customerId, input.entityId, input.filename)
      : storageKeys.document(input.entityType, input.entityId, input.filename);
  const uploaded = await storage.uploadObject({ key, body: input.bytes, contentType, contentLength: input.bytes.length, visibility: "PRIVATE", metadata: { resource: "document", documentType: input.documentType, entityType: input.entityType, entityId: input.entityId } });
  try {
    const [document] = await db.insert(storedDocuments).values({ documentType: input.documentType, entityType: input.entityType, entityId: input.entityId, customerId: input.customerId ?? null, quoteId: input.quoteId ?? null, orderId: input.orderId ?? null, storageKey: key, originalFilename: input.filename, contentType, fileSize: input.bytes.length, etag: uploaded.etag, status: "AVAILABLE", isPrivate: true, createdBy: input.createdBy ?? null }).returning();
    if (!document) throw new Error("Document metadata was not saved");
    return document;
  } catch (error) { await storage.deleteObject(key).catch(() => undefined); throw error; }
}

export async function authorizeDocument(request: Request, document: typeof storedDocuments.$inferSelect) {
  const session = await requireUser(request);
  if (await getAdminAccess(request)) return { session, admin: true };
  if (document.customerId) { const [customer] = await db.select({ id: customers.id }).from(customers).where(and(eq(customers.id, document.customerId), eq(customers.userId, session.user.id))).limit(1); if (customer) return { session, admin: false }; }
  if (document.quoteId) { const [quote] = await db.select({ id: quotes.id }).from(quotes).where(and(eq(quotes.id, document.quoteId), eq(quotes.userId, session.user.id))).limit(1); if (quote) return { session, admin: false }; }
  if (document.orderId) { const [order] = await db.select({ id: orders.id }).from(orders).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(orders.id, document.orderId), eq(customers.userId, session.user.id))).limit(1); if (order) return { session, admin: false }; }
  throw new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "You do not have access to this document" } }), { status: 403, headers: { "Content-Type": "application/json" } });
}
