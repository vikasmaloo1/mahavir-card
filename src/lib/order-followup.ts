import "server-only";

import { and, eq, inArray, lte } from "drizzle-orm";

import { artworkRequirements, artworks, customers, orderItems, orders, payments } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { emitNotification } from "@/lib/notifications/emit";

const PAYMENT_REMINDER_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Reminds customers whose order genuinely still needs artwork: the order is in
 * an early, pre-production status, at least one of its items belongs to a
 * pricing rule that actually requires artwork, and the order has zero linked
 * artwork rows at all — checkout already attaches artwork before an order can
 * be created through it (src/app/api/checkout/route.ts), so a real order with
 * no artwork rows only happens via a quote conversion that skipped upload.
 * One reminder per order (notification_log dedupe on event+order id).
 */
export async function runPendingArtworkReminders() {
  const pendingOrders = await db.select().from(orders).where(inArray(orders.status, ["PENDING", "CONFIRMED"]));
  if (!pendingOrders.length) return { checked: 0, remindedCount: 0 };

  const orderIds = pendingOrders.map((order) => order.id);
  const [items, existingArtworks] = await Promise.all([
    db.select({ orderId: orderItems.orderId, variantId: orderItems.variantId, configuration: orderItems.configuration }).from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    db.select({ orderId: artworks.orderId }).from(artworks).where(inArray(artworks.orderId, orderIds)),
  ]);
  const ordersWithArtwork = new Set(existingArtworks.map((row) => row.orderId));

  const ruleIds = [...new Set(items.map((item) => (item.configuration as Record<string, unknown> | null)?.pricingRuleId).filter((id): id is string => typeof id === "string"))];
  const requirements = ruleIds.length ? await db.select({ pricingRuleId: artworkRequirements.pricingRuleId }).from(artworkRequirements).where(and(eq(artworkRequirements.artworkRequired, true), inArray(artworkRequirements.pricingRuleId, ruleIds))) : [];
  const requiringRuleIds = new Set(requirements.map((row) => row.pricingRuleId));

  let remindedCount = 0;
  for (const order of pendingOrders) {
    if (ordersWithArtwork.has(order.id)) continue;
    const orderItemRows = items.filter((item) => item.orderId === order.id);
    const needsArtwork = orderItemRows.some((item) => {
      const ruleId = (item.configuration as Record<string, unknown> | null)?.pricingRuleId;
      return typeof ruleId === "string" && requiringRuleIds.has(ruleId);
    });
    if (!needsArtwork || !order.customerId) continue;
    const [customer] = await db.select({ email: customers.email, contactName: customers.contactName }).from(customers).where(eq(customers.id, order.customerId)).limit(1);
    const created = await emitNotification({
      customerId: order.customerId,
      event: "ARTWORK_REQUIRED",
      relatedEntityType: "order",
      relatedEntityId: order.id,
      recipientEmail: customer?.email ?? null,
      context: { customerName: customer?.contactName, orderNumber: order.orderNumber, nextAction: "Upload your CDR artwork from the order page." },
    });
    if (created) remindedCount += 1;
  }
  return { checked: pendingOrders.length, remindedCount };
}

/**
 * Reminds customers about orders whose payment is still genuinely pending —
 * status PENDING only (an online payment started but never completed).
 * COD_PENDING is deliberately excluded: that's the expected resting state for
 * cash-on-delivery until dispatch, not something the customer needs to act on,
 * and FAILED already has its own PAYMENT_FAILED notification. Only reminds
 * once the payment has been outstanding for at least a day, so a customer
 * mid-UPI confirmation isn't reminded seconds after checkout. One per order.
 */
export async function runPendingPaymentReminders() {
  const cutoff = new Date(Date.now() - PAYMENT_REMINDER_AGE_MS);
  const pendingPayments = await db
    .select({ payment: payments, order: orders })
    .from(payments)
    .innerJoin(orders, eq(payments.orderId, orders.id))
    .where(and(eq(payments.status, "PENDING"), lte(payments.createdAt, cutoff)));

  let remindedCount = 0;
  for (const { payment, order } of pendingPayments) {
    if (!order.customerId) continue;
    const [customer] = await db.select({ email: customers.email, contactName: customers.contactName }).from(customers).where(eq(customers.id, order.customerId)).limit(1);
    const created = await emitNotification({
      customerId: order.customerId,
      event: "PAYMENT_PENDING_REMINDER",
      relatedEntityType: "payment",
      relatedEntityId: payment.id,
      recipientEmail: customer?.email ?? null,
      context: { customerName: customer?.contactName, orderNumber: order.orderNumber, amount: order.total, nextAction: "Complete payment from your order page." },
    });
    if (created) remindedCount += 1;
  }
  return { checked: pendingPayments.length, remindedCount };
}
