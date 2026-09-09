import "server-only";

import { eq, sql } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { orders } from "@/lib/db/schema";
import { formatInvoiceNumber, getFinancialYear, parseInvoiceNumber } from "./invoice-sequence";

/**
 * Allocates or retrieves the invoice number for an order and persists it in the database.
 * If the order already has an invoice number, returns it.
 * If overrides are provided (e.g. by admin in invoice settings), saves the override.
 * Otherwise, determines current financial year, gets MAX(sequence) + 1 for that year from `orders`,
 * and saves `invoiceNumber`, `invoiceYear`, `invoiceSequence`, and `invoiceDate` directly into `orders`.
 */
export async function getOrAllocateInvoiceNumber(
  orderId: string,
  overrides?: {
    customNumber?: string;
    customDate?: Date | string;
  }
): Promise<{
  invoiceNumber: string;
  invoiceYear: string;
  invoiceSequence: number;
  invoiceDate: Date;
}> {
  // Fetch existing order record
  const [order] = await db
    .select({
      id: orders.id,
      invoiceNumber: orders.invoiceNumber,
      invoiceYear: orders.invoiceYear,
      invoiceSequence: orders.invoiceSequence,
      invoiceDate: orders.invoiceDate,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    throw new Error(`Order with ID "${orderId}" not found`);
  }

  // Handle manual admin override
  if (overrides?.customNumber && overrides.customNumber.trim()) {
    const customNum = overrides.customNumber.trim();
    const parsed = parseInvoiceNumber(customNum);
    const orderCreated = order.createdAt ? new Date(order.createdAt) : new Date();
    const invDate = overrides.customDate ? new Date(overrides.customDate) : order.invoiceDate || orderCreated;
    const year = parsed.year || order.invoiceYear || getFinancialYear(invDate);
    const seq = parsed.sequence || order.invoiceSequence || 1;

    await db
      .update(orders)
      .set({
        invoiceNumber: customNum,
        invoiceYear: year,
        invoiceSequence: seq,
        invoiceDate: invDate,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    return {
      invoiceNumber: customNum,
      invoiceYear: year,
      invoiceSequence: seq,
      invoiceDate: invDate,
    };
  }

  // If order already has an invoice number assigned in DB, return it
  if (order.invoiceNumber) {
    const invDate = order.invoiceDate || order.createdAt || new Date();
    const year = order.invoiceYear || getFinancialYear(invDate);
    const seq = order.invoiceSequence || 1;

    return {
      invoiceNumber: order.invoiceNumber,
      invoiceYear: year,
      invoiceSequence: seq,
      invoiceDate: invDate,
    };
  }

  // Otherwise, auto-allocate next sequence for the financial year
  const orderCreated = order.createdAt ? new Date(order.createdAt) : new Date();
  const invDate = overrides?.customDate ? new Date(overrides.customDate) : orderCreated;
  const year = getFinancialYear(invDate);

  // Find max sequence in this financial year
  const [maxResult] = await db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(${orders.invoiceSequence}), 0)::int`,
    })
    .from(orders)
    .where(eq(orders.invoiceYear, year));

  const nextSeq = (maxResult?.maxSeq ?? 0) + 1;
  const generatedInvoiceNumber = formatInvoiceNumber(year, nextSeq);

  await db
    .update(orders)
    .set({
      invoiceNumber: generatedInvoiceNumber,
      invoiceYear: year,
      invoiceSequence: nextSeq,
      invoiceDate: invDate,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  return {
    invoiceNumber: generatedInvoiceNumber,
    invoiceYear: year,
    invoiceSequence: nextSeq,
    invoiceDate: invDate,
  };
}
