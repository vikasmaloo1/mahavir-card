import { z } from "zod";
import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { generateInvoiceDocument } from "@/lib/pdf-documents";
import { customers, orders, payments } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { verifyRazorpayPaymentSignature, PaymentConfigurationError } from "@/lib/payment-service";
import { requireUser } from "@/lib/permissions";
import { markRazorpayPaymentPaid, RazorpayPaymentStateError } from "@/lib/razorpay-payment-state";

const callbackSchema = z.object({ razorpayOrderId: z.string().trim().min(5).max(100), razorpayPaymentId: z.string().trim().min(5).max(100), razorpaySignature: z.string().trim().length(64) });

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, callbackSchema);
    const [owned] = await db.select({ providerOrderId: payments.providerOrderId }).from(payments).innerJoin(orders, eq(payments.orderId, orders.id)).innerJoin(customers, eq(orders.customerId, customers.id)).where(and(eq(payments.providerOrderId, input.razorpayOrderId), eq(customers.userId, session.user.id))).limit(1);
    if (!owned?.providerOrderId) return jsonError("Payment not found", 404);
    if (!verifyRazorpayPaymentSignature(owned.providerOrderId, input.razorpayPaymentId, input.razorpaySignature)) return jsonError("Payment signature verification failed", 400);
    const result = await markRazorpayPaymentPaid({ providerOrderId: owned.providerOrderId, providerPaymentId: input.razorpayPaymentId, changedBy: session.user.id, rawData: { source: "CHECKOUT_CALLBACK" } });
    try { await generateInvoiceDocument(result.order.id, session.user.id); } catch (error) { console.error("Invoice generation failed after verified Razorpay payment", { orderId: result.order.id, error }); }
    return jsonOk(result);
  } catch (error) {
    if (error instanceof PaymentConfigurationError) return jsonError(error.message, 503);
    if (error instanceof RazorpayPaymentStateError) return jsonError(error.message, 409);
    return error instanceof Response ? error : handleApiError(error);
  }
}
