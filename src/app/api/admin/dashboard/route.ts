import { count, desc, eq, gte, inArray } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, inquiries, orders, payments, quotes, walletTransactions } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [ordersToday, pendingOrders, pendingQuotes, newInquiries, pendingPayments, pendingArtwork, pendingWalletRequests, recentOrders, recentQuotes] = await Promise.all([
      db.select({ value: count() }).from(orders).where(gte(orders.createdAt, today)),
      db.select({ value: count() }).from(orders).where(inArray(orders.status, ["PENDING", "CONFIRMED", "ARTWORK_REVIEW", "ARTWORK_APPROVED", "IN_PRODUCTION", "QC", "READY"])),
      db.select({ value: count() }).from(quotes).where(inArray(quotes.status, ["NEW", "REVIEWING", "QUOTE_CREATED", "SENT_TO_CUSTOMER"])),
      db.select({ value: count() }).from(inquiries).where(inArray(inquiries.status, ["NEW", "CONTACTED", "QUALIFIED", "QUOTATION_REQUESTED"])),
      db.select({ value: count() }).from(payments).where(inArray(payments.status, ["PENDING", "AUTHORIZED", "COD_PENDING"])),
      db.select({ value: count() }).from(artworks).where(eq(artworks.status, "PENDING_REVIEW")),
      db.select({ value: count() }).from(walletTransactions).where(eq(walletTransactions.status, "PENDING")),
      db.select({ orderNumber: orders.orderNumber, status: orders.status, total: orders.total }).from(orders).orderBy(desc(orders.createdAt)).limit(5),
      db.select({ quoteNumber: quotes.quoteNumber, contactName: quotes.contactName, status: quotes.status, total: quotes.total }).from(quotes).orderBy(desc(quotes.createdAt)).limit(5),
    ]);
    return jsonOk({ ordersToday: Number(ordersToday[0]?.value ?? 0), pendingOrders: Number(pendingOrders[0]?.value ?? 0), pendingQuotes: Number(pendingQuotes[0]?.value ?? 0), newInquiries: Number(newInquiries[0]?.value ?? 0), pendingPayments: Number(pendingPayments[0]?.value ?? 0), pendingArtwork: Number(pendingArtwork[0]?.value ?? 0), pendingWalletRequests: Number(pendingWalletRequests[0]?.value ?? 0), recentOrders, recentQuotes });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
