import "server-only";

import { eq, inArray } from "drizzle-orm";

import { extractArtworkIds } from "@/lib/artwork-validation";
import { db } from "@/lib/db/server";
import { artworks, orderItems, orders, orderStatusEvents, quoteItems, quotes } from "@/lib/db/schema";

export type QuoteConversionResult =
  | { ok: true; order: typeof orders.$inferSelect; created: boolean }
  | { ok: false; reason: "NOT_FOUND" | "NOT_APPROVED" | "EMPTY" | "CREATE_FAILED" };

export function isQuoteExpired(quote: { validUntil: Date | string | null }) {
  return Boolean(quote.validUntil) && new Date(quote.validUntil!).getTime() < Date.now();
}

/**
 * Converts a customer-approved quote into an order, honoring the quote's snapshotted
 * pricing as-is (a quote is a formal offer — accepting it should never recalculate).
 * Idempotent: if an order already exists for this quote, it's returned rather than
 * duplicated. Shared by the admin-initiated and customer-initiated accept flows so
 * both stay identical.
 */
export async function convertQuoteToOrder(quoteId: string): Promise<QuoteConversionResult> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return { ok: false, reason: "NOT_FOUND" };
  if (quote.status !== "CUSTOMER_APPROVED") return { ok: false, reason: "NOT_APPROVED" };

  const [existing] = await db.select().from(orders).where(eq(orders.quoteId, quoteId)).limit(1);
  if (existing) return { ok: true, order: existing, created: false };

  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  if (!items.length) return { ok: false, reason: "EMPTY" };

  const order = await db.transaction(async (tx) => {
    const [created] = await tx.insert(orders).values({
      orderNumber: `MHC-O-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      quoteId: quote.id,
      customerId: quote.customerId,
      status: "CONFIRMED",
      subtotal: quote.subtotal,
      taxableSubtotal: quote.taxableSubtotal,
      tax: quote.tax,
      taxType: quote.taxType,
      taxRate: quote.taxRate,
      cgstRate: quote.cgstRate,
      cgstAmount: quote.cgstAmount,
      sgstRate: quote.sgstRate,
      sgstAmount: quote.sgstAmount,
      igstRate: quote.igstRate,
      igstAmount: quote.igstAmount,
      taxJurisdictionState: quote.taxJurisdictionState,
      total: quote.total,
      notes: quote.notes,
    }).returning();
    if (!created) return null;
    await tx.insert(orderStatusEvents).values({ orderId: created.id, status: created.status, notes: `Created from quote ${quote.quoteNumber}` });
    await tx.insert(orderItems).values(items.map((item) => ({
      orderId: created.id,
      productId: item.productId,
      variantId: item.variantId,
      description: item.description,
      configuration: item.configuration,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxableAmount: item.taxableAmount,
      taxAmount: item.taxAmount,
      cgstAmount: item.cgstAmount,
      sgstAmount: item.sgstAmount,
      igstAmount: item.igstAmount,
      totalPrice: item.totalPrice,
      pricingSnapshot: { ...item.pricingSnapshot, quoteId: quote.id, quoteItemId: item.id, discountAmount: quote.discountAmount },
    })));
    await tx.update(quotes).set({ status: "CONVERTED_TO_ORDER", updatedAt: new Date() }).where(eq(quotes.id, quoteId));
    const quoteArtworkIds = [...new Set(items.flatMap((item) => extractArtworkIds((item.configuration ?? {}) as Record<string, unknown>)))];
    if (quoteArtworkIds.length) {
      await tx.update(artworks).set({ orderId: created.id }).where(inArray(artworks.id, quoteArtworkIds));
    }
    return created;
  });

  return order ? { ok: true, order, created: true } : { ok: false, reason: "CREATE_FAILED" };
}
