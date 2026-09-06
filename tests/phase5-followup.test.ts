import assert from "node:assert/strict";
import test from "node:test";

import { classifyQuoteFollowup } from "../src/lib/quote-followup";
import { isValidCronAuth } from "../src/lib/cron-auth";
import { emailConfigured, sendEmail } from "../src/lib/notifications/channels";
import { renderNotification } from "../src/lib/notifications/templates";

test("email provider is not configured in this environment, and sendEmail is a safe no-op rather than a fake success", async () => {
  assert.equal(emailConfigured(), false, "RESEND_API_KEY must not be set in the test environment");
  const result = await sendEmail("test@example.com", "Subject", "Body");
  assert.equal(result.sent, false);
  assert.equal(result.error, "NOT_CONFIGURED");
});

test("classifyQuoteFollowup ignores quotes that aren't awaiting a decision", () => {
  for (const status of ["NEW", "REVIEWING", "QUOTE_CREATED", "CUSTOMER_APPROVED", "CUSTOMER_REJECTED", "CONVERTED_TO_ORDER", "CANCELLED"]) {
    assert.equal(classifyQuoteFollowup({ status, validUntil: new Date(Date.now() + 1000) }), null, `${status} should not be followed up`);
  }
});

test("classifyQuoteFollowup treats a sent quote with no validUntil as awaiting response", () => {
  assert.equal(classifyQuoteFollowup({ status: "SENT_TO_CUSTOMER", validUntil: null }), "AWAITING_RESPONSE");
});

test("classifyQuoteFollowup buckets by time remaining until validUntil", () => {
  const now = Date.parse("2026-01-10T00:00:00Z");
  assert.equal(classifyQuoteFollowup({ status: "SENT_TO_CUSTOMER", validUntil: new Date(now + 7 * 86400000) }, now), "AWAITING_RESPONSE");
  assert.equal(classifyQuoteFollowup({ status: "SENT_TO_CUSTOMER", validUntil: new Date(now + 12 * 3600000) }, now), "EXPIRING_SOON");
  assert.equal(classifyQuoteFollowup({ status: "SENT_TO_CUSTOMER", validUntil: new Date(now - 1000) }, now), "EXPIRED");
});

test("classifyQuoteFollowup treats the exact expiry instant as expired, not expiring-soon", () => {
  const now = Date.parse("2026-01-10T00:00:00Z");
  assert.equal(classifyQuoteFollowup({ status: "SENT_TO_CUSTOMER", validUntil: new Date(now) }, now), "EXPIRED");
});

test("cron auth rejects when no secret is configured, even with a header present", () => {
  assert.equal(isValidCronAuth("Bearer anything", undefined), false);
  assert.equal(isValidCronAuth(null, undefined), false);
});

test("cron auth rejects a missing or wrong header, accepts an exact match", () => {
  assert.equal(isValidCronAuth(null, "s3cret"), false);
  assert.equal(isValidCronAuth("Bearer wrong", "s3cret"), false);
  assert.equal(isValidCronAuth("Bearer s3cret", "s3cret"), true);
});

test("QUOTE_EXPIRING_SOON, ARTWORK_REQUIRED, and PAYMENT_PENDING_REMINDER all carry a concrete next action", () => {
  const expiring = renderNotification("QUOTE_EXPIRING_SOON", { customerName: "Vikas", quoteNumber: "MHC-Q-1", nextAction: "View your quotation and approve it." });
  assert.match(expiring.body, /expire/i);
  assert.match(expiring.body, /View your quotation/);

  const artwork = renderNotification("ARTWORK_REQUIRED", { customerName: "Vikas", orderNumber: "MHC-O-1", nextAction: "Upload your artwork from the order page." });
  assert.match(artwork.body, /artwork/i);
  assert.match(artwork.body, /Upload your artwork/);

  const payment = renderNotification("PAYMENT_PENDING_REMINDER", { customerName: "Vikas", orderNumber: "MHC-O-1", nextAction: "Complete payment from your order page." });
  assert.match(payment.body, /payment/i);
  assert.match(payment.body, /Complete payment/);
});
