import assert from "node:assert/strict";
import test from "node:test";

import { renderNotification } from "../src/lib/notifications/templates";
import type { NotificationEvent } from "../src/lib/notifications/events";
import { quoteFunnelSummary, topNoResultQueries } from "../src/lib/analytics-helpers";

const ALL_EVENTS: NotificationEvent[] = [
  "QUOTE_CREATED", "QUOTE_SENT", "QUOTE_APPROVED", "QUOTE_REJECTED", "QUOTE_EXPIRED",
  "ORDER_CREATED", "PAYMENT_CONFIRMED", "PAYMENT_FAILED", "ARTWORK_REJECTED",
  "ORDER_STATUS_CHANGED", "ORDER_READY", "ORDER_DISPATCHED",
];

test("every notification event renders a non-empty subject and body with the support line", () => {
  for (const event of ALL_EVENTS) {
    const { subject, body } = renderNotification(event, { customerName: "Vikas", orderNumber: "MHC-O-2026-TEST", quoteNumber: "MHC-Q-2026-TEST", amount: "1000.00" });
    assert.ok(subject.length > 0, `${event} produced an empty subject`);
    assert.ok(body.length > 0, `${event} produced an empty body`);
    assert.match(body, /Mahavir Card/, `${event} body is missing the support line`);
  }
});

test("templates greet the customer by name when provided, and fall back gracefully when not", () => {
  const withName = renderNotification("ORDER_CREATED", { customerName: "Priya", orderNumber: "MHC-O-1" });
  assert.match(withName.body, /Hi Priya/);
  const withoutName = renderNotification("ORDER_CREATED", { orderNumber: "MHC-O-1" });
  assert.match(withoutName.body, /Hi there/);
});

test("top no-result queries groups by normalized query, ignores matched searches, and sorts by count", () => {
  const rows = [
    { query: "Bill Book", normalizedQuery: "bill book", confidence: "NONE" },
    { query: "bill book!", normalizedQuery: "bill book", confidence: "NONE" },
    { query: "bill book", normalizedQuery: "bill book", confidence: "NONE" },
    { query: "packing slip", normalizedQuery: "packing slip", confidence: "NONE" },
    { query: "visiting card", normalizedQuery: "visiting card", confidence: "HIGH" },
  ];
  const top = topNoResultQueries(rows);
  assert.deepEqual(top[0], { query: "bill book", count: 3 });
  assert.deepEqual(top[1], { query: "packing slip", count: 1 });
  assert.equal(top.length, 2);
});

test("top no-result queries respects the limit", () => {
  const rows = Array.from({ length: 30 }, (_, index) => ({ query: `q${index}`, normalizedQuery: `q${index}`, confidence: "NONE" }));
  assert.equal(topNoResultQueries(rows, 5).length, 5);
});

test("quote funnel summary computes conversion rate and handles zero quotes", () => {
  const summary = quoteFunnelSummary([
    { status: "SENT_TO_CUSTOMER", count: 3 },
    { status: "CONVERTED_TO_ORDER", count: 7 },
    { status: "CUSTOMER_REJECTED", count: 2 },
  ]);
  assert.equal(summary.totalQuotes, 12);
  assert.equal(summary.conversionRate, Math.round((7 / 12) * 1000) / 10);
  assert.equal(quoteFunnelSummary([]).conversionRate, 0);
});
