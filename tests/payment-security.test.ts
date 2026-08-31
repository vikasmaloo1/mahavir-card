import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "../src/lib/payment-service";

test("Razorpay checkout signatures require the exact server order and payment IDs", () => {
  const secret = "test-secret-never-used-outside-this-test";
  const signature = createHmac("sha256", secret).update("order_test|pay_test").digest("hex");
  assert.equal(verifyRazorpayPaymentSignature("order_test", "pay_test", signature, secret), true);
  assert.equal(verifyRazorpayPaymentSignature("order_other", "pay_test", signature, secret), false);
  assert.equal(verifyRazorpayPaymentSignature("order_test", "pay_other", signature, secret), false);
});

test("Razorpay webhook signatures cover the unmodified raw body", () => {
  const secret = "webhook-test-secret";
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_test" } } } });
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyRazorpayWebhookSignature(body, signature, secret), true);
  assert.equal(verifyRazorpayWebhookSignature(`${body} `, signature, secret), false);
});
