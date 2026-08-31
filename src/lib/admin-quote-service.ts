import { eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { quoteItems, quotes } from "@/lib/db/schema";
import { calculateTax } from "@/lib/tax-service";

export async function recalculateQuote(quoteId: string) {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return null;

  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0);
  const discount = Math.min(subtotal, Math.max(0, Number(quote.discountAmount)));
  const taxableSubtotal = Math.max(0, subtotal - discount);
  const stateCode = (quote.taxJurisdictionState as "GJ" | "RJ") || "GJ";
  const taxCalc = calculateTax({ taxableSubtotal, stateCode, taxRate: 18 });

  const [updated] = await db.update(quotes).set({
    subtotal: subtotal.toFixed(2),
    taxableSubtotal: taxCalc.taxableSubtotal,
    discountAmount: discount.toFixed(2),
    tax: taxCalc.taxAmount,
    taxType: taxCalc.taxType,
    taxRate: taxCalc.taxRate,
    cgstRate: taxCalc.cgstRate.toFixed(3),
    cgstAmount: taxCalc.cgstAmount,
    sgstRate: taxCalc.sgstRate.toFixed(3),
    sgstAmount: taxCalc.sgstAmount,
    igstRate: taxCalc.igstRate.toFixed(3),
    igstAmount: taxCalc.igstAmount,
    total: taxCalc.grandTotal,
    updatedAt: new Date(),
  }).where(eq(quotes.id, quoteId)).returning();
  return updated ?? null;
}
