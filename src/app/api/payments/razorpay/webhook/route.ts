import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { customers, orders, payments } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { emitNotification } from "@/lib/notifications/emit";
import { generateInvoiceDocument } from "@/lib/pdf-documents";
import { PaymentConfigurationError, verifyRazorpayWebhookSignature } from "@/lib/payment-service";
import { markRazorpayPaymentPaid, RazorpayPaymentStateError } from "@/lib/razorpay-payment-state";

type RazorpayWebhook = { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } } };

export async function POST(request: Request) {
  const rawBody = await request.text();
  try {
    const signature = request.headers.get("x-razorpay-signature") ?? "";
    if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) return jsonError("Invalid webhook signature", 401);
    const event = JSON.parse(rawBody) as RazorpayWebhook;
    if (event.event === "payment.failed") {
      const failedOrderId = event.payload?.payment?.entity?.order_id;
      if (failedOrderId) {
        const [record] = await db.select({ order: orders, payment: payments }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).where(eq(payments.providerOrderId, failedOrderId)).limit(1);
        if (record) {
          const [customer] = record.order.customerId ? await db.select({ email: customers.email, contactName: customers.contactName }).from(customers).where(eq(customers.id, record.order.customerId)).limit(1) : [];
          await emitNotification({
            customerId: record.order.customerId,
            event: "PAYMENT_FAILED",
            relatedEntityType: "payment",
            relatedEntityId: record.payment.id,
            recipientEmail: customer?.email ?? null,
            context: { customerName: customer?.contactName, orderNumber: record.order.orderNumber },
          });
        }
      }
      return jsonOk({ accepted: true, processed: false });
    }
    if (!event.event || !["payment.captured", "order.paid"].includes(event.event)) return jsonOk({ accepted: true, processed: false });
    const payment = event.payload?.payment?.entity;
    if (!payment?.id || !payment.order_id || payment.status !== "captured") return jsonOk({ accepted: true, processed: false });
    const result = await markRazorpayPaymentPaid({ providerOrderId: payment.order_id, providerPaymentId: payment.id, amountPaise: payment.amount, rawData: JSON.parse(rawBody) as Record<string, unknown> });
    try { await generateInvoiceDocument(result.order.id, null); } catch (error) { console.error("Invoice generation failed after Razorpay webhook", { orderId: result.order.id, error }); }
    if (!result.alreadyPaid && result.order.customerId) {
      const [customer] = await db.select({ email: customers.email, contactName: customers.contactName }).from(customers).where(eq(customers.id, result.order.customerId)).limit(1);
      await emitNotification({
        customerId: result.order.customerId,
        event: "PAYMENT_CONFIRMED",
        relatedEntityType: "payment",
        relatedEntityId: result.payment.id,
        recipientEmail: customer?.email ?? null,
        context: { customerName: customer?.contactName, orderNumber: result.order.orderNumber, amount: result.order.total },
      });
    }
    return jsonOk({ accepted: true, processed: true });
  } catch (error) {
    if (error instanceof SyntaxError) return jsonError("Invalid webhook payload", 400);
    if (error instanceof PaymentConfigurationError) return jsonError(error.message, 503);
    if (error instanceof RazorpayPaymentStateError) return jsonError(error.message, 409);
    return handleApiError(error);
  }
}
