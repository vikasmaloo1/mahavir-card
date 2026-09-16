import "server-only";

import { sql } from "drizzle-orm";
import { db } from "@/lib/db/server";
import { bills, orders } from "@/lib/db/schema";
import { formatInvoiceNumber, getFinancialYear, parseInvoiceNumber } from "./invoice-sequence";

export function formatChalanNumber(sequence: number, prefix: string = "CH"): string {
  return `${prefix}-${String(sequence).padStart(4, "0")}`;
}

export function parseChalanNumber(chalanNumber: string): number | null {
  const match = chalanNumber.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Returns the next available incremental invoice and chalan numbers.
 */
export async function getNextBillNumbers(date: Date = new Date()): Promise<{
  invoiceYear: string;
  nextInvoiceSequence: number;
  nextInvoiceNumber: string;
  nextChalanSequence: number;
  nextChalanNumber: string;
}> {
  const year = getFinancialYear(date);

  // 1. Next Invoice Sequence (check highest between orders and bills)
  const [maxOrderSeqResult] = await db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(${orders.invoiceSequence}), 0)::int`,
    })
    .from(orders)
    .where(sql`${orders.invoiceYear} = ${year}`);

  const [maxBillSeqResult] = await db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(${bills.invoiceSequence}), 0)::int`,
    })
    .from(bills)
    .where(sql`${bills.invoiceYear} = ${year}`);

  const currentMaxInvoiceSeq = Math.max(
    maxOrderSeqResult?.maxSeq ?? 0,
    maxBillSeqResult?.maxSeq ?? 0
  );
  const nextInvoiceSequence = currentMaxInvoiceSeq + 1;
  const nextInvoiceNumber = formatInvoiceNumber(year, nextInvoiceSequence);

  // 2. Next Chalan Sequence (check highest between orders and bills)
  const [maxOrderChalanResult] = await db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(${orders.chalanSequence}), 0)::int`,
    })
    .from(orders);

  const [maxBillChalanResult] = await db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(${bills.chalanSequence}), 0)::int`,
    })
    .from(bills);

  const currentMaxChalanSeq = Math.max(
    maxOrderChalanResult?.maxSeq ?? 0,
    maxBillChalanResult?.maxSeq ?? 0
  );
  const nextChalanSequence = currentMaxChalanSeq + 1;
  const nextChalanNumber = formatChalanNumber(nextChalanSequence);

  return {
    invoiceYear: year,
    nextInvoiceSequence,
    nextInvoiceNumber,
    nextChalanSequence,
    nextChalanNumber,
  };
}
