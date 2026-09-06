import "server-only";

import { and, eq } from "drizzle-orm";

import { quotes } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { emitNotification } from "@/lib/notifications/emit";

export type QuoteFollowupState = "AWAITING_RESPONSE" | "EXPIRING_SOON" | "EXPIRED" | null;

const EXPIRING_SOON_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Pure classifier: only a SENT_TO_CUSTOMER quote is ever "awaiting" anything —
 * once a customer has approved/rejected it, or it's already expired/converted,
 * there is nothing to follow up on. Kept DB-free so it's directly testable.
 */
export function classifyQuoteFollowup(quote: { status: string; validUntil: Date | string | null }, now = Date.now()): QuoteFollowupState {
  if (quote.status !== "SENT_TO_CUSTOMER") return null;
  if (!quote.validUntil) return "AWAITING_RESPONSE";
  const msUntilExpiry = new Date(quote.validUntil).getTime() - now;
  if (msUntilExpiry <= 0) return "EXPIRED";
  if (msUntilExpiry <= EXPIRING_SOON_WINDOW_MS) return "EXPIRING_SOON";
  return "AWAITING_RESPONSE";
}

/**
 * Evaluates every SENT_TO_CUSTOMER quote and, once per quote (the notification_log
 * unique index makes re-running this safe), emits QUOTE_EXPIRING_SOON for quotes
 * about to lapse and formally expires+notifies quotes whose validity has passed.
 * Safe to call from a cron or an admin-triggered endpoint — same function either way.
 */
export async function runQuoteFollowups() {
  const rows = await db.select().from(quotes).where(eq(quotes.status, "SENT_TO_CUSTOMER"));
  let expiringSoonCount = 0;
  let expiredCount = 0;

  for (const quote of rows) {
    const state = classifyQuoteFollowup(quote);
    if (state === "EXPIRING_SOON") {
      const created = await emitNotification({
        customerId: quote.customerId,
        event: "QUOTE_EXPIRING_SOON",
        relatedEntityType: "quote",
        relatedEntityId: quote.id,
        recipientEmail: quote.email,
        context: { customerName: quote.contactName, quoteNumber: quote.quoteNumber, amount: quote.total, nextAction: "View your quotation and approve it before it expires." },
      });
      if (created) expiringSoonCount += 1;
    } else if (state === "EXPIRED") {
      const [updated] = await db.update(quotes).set({ status: "EXPIRED", updatedAt: new Date() }).where(and(eq(quotes.id, quote.id), eq(quotes.status, "SENT_TO_CUSTOMER"))).returning();
      if (updated) {
        await emitNotification({
          customerId: quote.customerId,
          event: "QUOTE_EXPIRED",
          relatedEntityType: "quote",
          relatedEntityId: quote.id,
          recipientEmail: quote.email,
          context: { customerName: quote.contactName, quoteNumber: quote.quoteNumber, nextAction: "Request a new quote for the same or updated specifications." },
        });
        expiredCount += 1;
      }
    }
  }

  return { checked: rows.length, expiringSoonCount, expiredCount };
}

/**
 * Admin-initiated reminder for a specific quote — distinct from the automated
 * QUOTE_EXPIRING_SOON dedupe key, so an admin can deliberately nudge a customer
 * even if the automated once-per-quote reminder already fired. A timestamp in
 * the entity id keeps each manual click its own log row (the human clicking
 * the button is the rate limit, not a dedupe index).
 */
export async function sendManualQuoteReminder(quoteId: string) {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) return { ok: false as const, reason: "NOT_FOUND" as const };
  if (quote.status !== "SENT_TO_CUSTOMER") return { ok: false as const, reason: "NOT_AWAITING_RESPONSE" as const };
  await emitNotification({
    customerId: quote.customerId,
    event: "QUOTE_EXPIRING_SOON",
    relatedEntityType: "quote",
    relatedEntityId: `${quote.id}:manual:${Date.now()}`,
    recipientEmail: quote.email,
    context: { customerName: quote.contactName, quoteNumber: quote.quoteNumber, amount: quote.total, nextAction: "View your quotation and approve it." },
  });
  return { ok: true as const };
}
