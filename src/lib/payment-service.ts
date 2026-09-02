import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export type PaymentMethod = "RAZORPAY" | "COD" | "CREDIT" | "UPI_QR";
export type PaymentIntent = { method: PaymentMethod; amount: string; status: "PENDING" | "COD_PENDING" | "CREDIT_APPROVED"; provider: "RAZORPAY" | "COD" | "CUSTOMER_CREDIT" | "UPI_QR" };
export type RazorpayOrder = { id: string; amount: number; currency: string; receipt: string; status: string };

export class PaymentConfigurationError extends Error {}
export class PaymentProviderError extends Error {}

export function createPaymentIntent(method: PaymentMethod, amount: string): PaymentIntent {
  if (method === "RAZORPAY") return { method, amount, status: "PENDING", provider: "RAZORPAY" };
  if (method === "COD") return { method, amount, status: "COD_PENDING", provider: "COD" };
  // UPI_QR has no gateway/webhook: order is created PENDING, the customer scans a QR
  // paying the business's own UPI ID directly, then submits their UTR reference for
  // an admin to manually match against the bank statement and mark the payment PAID.
  if (method === "UPI_QR") return { method, amount, status: "PENDING", provider: "UPI_QR" };
  return { method, amount, status: "CREDIT_APPROVED", provider: "CUSTOMER_CREDIT" };
}

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET);
}

export function razorpayPublicKey() {
  if (!process.env.RAZORPAY_KEY_ID) throw new PaymentConfigurationError("Online payment is not configured");
  return process.env.RAZORPAY_KEY_ID;
}

export async function createRazorpayOrder(amount: string, receipt: string): Promise<RazorpayOrder> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || !process.env.RAZORPAY_WEBHOOK_SECRET) throw new PaymentConfigurationError("Online payment is not configured. Choose COD or business credit.");
  const amountPaise = Math.round(Number(amount) * 100);
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) throw new PaymentProviderError("The payment amount is invalid");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40) }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as RazorpayOrder | { error?: { description?: string } } | null;
  if (!response.ok || !payload || !("id" in payload)) throw new PaymentProviderError(payload && "error" in payload ? payload.error?.description || "Razorpay order creation failed" : "Razorpay order creation failed");
  return payload;
}

export function verifyRazorpayPaymentSignature(orderId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET) {
  if (!secret) throw new PaymentConfigurationError("Razorpay payment verification is not configured");
  return safeEqual(createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex"), signature);
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string, secret = process.env.RAZORPAY_WEBHOOK_SECRET) {
  if (!secret) throw new PaymentConfigurationError("Razorpay webhook verification is not configured");
  return safeEqual(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}

function safeEqual(expected: string, received: string) {
  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}
