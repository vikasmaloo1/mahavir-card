import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { quoteItems, quotes } from "@/lib/db/schema";

export async function recalculateQuote(quoteId: string) {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return null;

  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const discount = Math.min(subtotal, Math.max(0, Number(quote.discountAmount)));
  const tax = Math.max(0, Number(quote.tax));
  const total = Math.max(0, subtotal - discount + tax);
  const [updated] = await db.update(quotes).set({
    subtotal: subtotal.toFixed(2),
    discountAmount: discount.toFixed(2),
    total: total.toFixed(2),
    updatedAt: new Date(),
  }).where(eq(quotes.id, quoteId)).returning();
  return updated ?? null;
}
