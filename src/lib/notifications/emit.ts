import "server-only";

import { eq } from "drizzle-orm";

import { customers, notificationLog } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { emailConfigured, sendEmail } from "./channels";
import type { NotificationContext, NotificationEvent } from "./events";
import { renderNotification } from "./templates";

export type EmitNotificationInput = {
  customerId: string | null;
  event: NotificationEvent;
  relatedEntityType: "quote" | "order" | "payment" | "artwork";
  relatedEntityId: string;
  context: NotificationContext;
  recipientEmail?: string | null;
};

/**
 * Records one notification per (event, entity) — the unique index on
 * notification_log makes a repeat emission for the same event+entity a no-op,
 * which is the whole duplicate-prevention mechanism (matters most for
 * payment webhooks, which can retry). Never throws: a notification failure
 * must not break the business operation that triggered it. The row insert is
 * awaited (fast, needed for dedup/audit before the caller moves on) but the
 * actual provider send is fire-and-forget so a slow/failed email can never
 * add latency to checkout, payment verification, or quote conversion.
 *
 * Returns whether a new row was actually created — false means this exact
 * event+entity was already logged (the dedupe index blocked it), which
 * callers that report "how many reminders did this send" must check, or
 * every re-run of an idempotent sweep would look like it resent everything.
 */
export async function emitNotification(input: EmitNotificationInput): Promise<boolean> {
  try {
    const { subject, body } = renderNotification(input.event, input.context);
    const [inserted] = await db
      .insert(notificationLog)
      .values({
        customerId: input.customerId,
        event: input.event,
        channel: "EMAIL",
        subject,
        body,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        status: emailConfigured() ? "QUEUED" : "NOT_CONFIGURED",
      })
      .onConflictDoNothing({ target: [notificationLog.event, notificationLog.relatedEntityType, notificationLog.relatedEntityId] })
      .returning();

    if (!inserted) return false;
    if (input.recipientEmail && emailConfigured()) void deliver(inserted.id, input.customerId, input.recipientEmail, subject, body);
    return true;
  } catch (error) {
    console.error("[notifications] emit failed", { event: input.event, error });
    return false;
  }
}

async function deliver(notificationId: string, customerId: string | null, recipientEmail: string, subject: string, body: string) {
  try {
    if (customerId) {
      const [customer] = await db.select({ enabled: customers.emailNotificationsEnabled }).from(customers).where(eq(customers.id, customerId)).limit(1);
      if (customer && customer.enabled === false) {
        await db.update(notificationLog).set({ status: "NOT_CONFIGURED" }).where(eq(notificationLog.id, notificationId));
        return;
      }
    }
    const result = await sendEmail(recipientEmail, subject, body);
    await db.update(notificationLog).set({ status: result.sent ? "SENT" : "FAILED" }).where(eq(notificationLog.id, notificationId));
    if (!result.sent) console.error("[notifications] send failed", { notificationId, error: result.error });
  } catch (error) {
    await db.update(notificationLog).set({ status: "FAILED" }).where(eq(notificationLog.id, notificationId)).catch(() => undefined);
    console.error("[notifications] deliver threw", { notificationId, error });
  }
}
