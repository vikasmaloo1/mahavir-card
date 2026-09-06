import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { notificationLog } from "@/lib/db/schema";
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
 * must not break the business operation that triggered it.
 */
export async function emitNotification(input: EmitNotificationInput): Promise<void> {
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
        status: emailConfigured() ? "PENDING" : "NOT_CONFIGURED",
      })
      .onConflictDoNothing({ target: [notificationLog.event, notificationLog.relatedEntityType, notificationLog.relatedEntityId] })
      .returning();

    if (!inserted || !input.recipientEmail || !emailConfigured()) return;

    try {
      const result = await sendEmail(input.recipientEmail, subject, body);
      await db.update(notificationLog).set({ status: result.sent ? "SENT" : "FAILED" }).where(eq(notificationLog.id, inserted.id));
    } catch {
      await db.update(notificationLog).set({ status: "FAILED" }).where(eq(notificationLog.id, inserted.id));
    }
  } catch (error) {
    console.error("[notifications] emit failed", { event: input.event, error });
  }
}
