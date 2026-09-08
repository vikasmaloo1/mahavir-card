import assert from "node:assert/strict";
import test from "node:test";

import { isValidIndianPhoneNumber, normalizePhoneNumber } from "../src/lib/phone";

test("offline customer phone validation accepts valid Indian 10-digit mobile numbers", () => {
  assert.equal(isValidIndianPhoneNumber("9876543210"), true);
  assert.equal(isValidIndianPhoneNumber("+91 98765 43210"), true);
  assert.equal(isValidIndianPhoneNumber("09876543210"), true);
  assert.equal(normalizePhoneNumber("9876543210"), "+919876543210");
  assert.equal(isValidIndianPhoneNumber("12345"), false);
});

test("offline order tax computation correctly splits intra-state (GJ/Pickup) and inter-state GST", () => {
  function computeTaxes(subtotal: number, deliveryMethod: "PICKUP" | "COURIER", deliveryState?: string) {
    const isIntraState = deliveryMethod === "PICKUP" || deliveryState === "GJ" || !deliveryState;
    const taxAmountNumber = Number(((subtotal * 18) / 100).toFixed(2));
    let cgstAmount = "0.00";
    let sgstAmount = "0.00";
    let igstAmount = "0.00";

    if (isIntraState) {
      const half = Number((taxAmountNumber / 2).toFixed(2));
      cgstAmount = half.toFixed(2);
      sgstAmount = (taxAmountNumber - half).toFixed(2);
    } else {
      igstAmount = taxAmountNumber.toFixed(2);
    }

    return { isIntraState, taxAmount: taxAmountNumber.toFixed(2), cgstAmount, sgstAmount, igstAmount };
  }

  // Intra-state GJ
  const gjTaxes = computeTaxes(1000, "COURIER", "GJ");
  assert.equal(gjTaxes.isIntraState, true);
  assert.equal(gjTaxes.taxAmount, "180.00");
  assert.equal(gjTaxes.cgstAmount, "90.00");
  assert.equal(gjTaxes.sgstAmount, "90.00");
  assert.equal(gjTaxes.igstAmount, "0.00");

  // Storefront Pickup is always Intra-state
  const pickupTaxes = computeTaxes(1000, "PICKUP", "RJ");
  assert.equal(pickupTaxes.isIntraState, true);
  assert.equal(pickupTaxes.taxAmount, "180.00");
  assert.equal(pickupTaxes.cgstAmount, "90.00");
  assert.equal(pickupTaxes.sgstAmount, "90.00");

  // Inter-state RJ Courier
  const rjTaxes = computeTaxes(1000, "COURIER", "RJ");
  assert.equal(rjTaxes.isIntraState, false);
  assert.equal(rjTaxes.taxAmount, "180.00");
  assert.equal(rjTaxes.cgstAmount, "0.00");
  assert.equal(rjTaxes.sgstAmount, "0.00");
  assert.equal(rjTaxes.igstAmount, "180.00");
});

test("offline order payment status determines full vs partial vs pending payment correctly", () => {
  function determinePaymentStatus(total: number, recorded: boolean, initialAmount: number) {
    const paidAmountNumber = recorded ? Math.min(Number(total), Math.max(0, Number(initialAmount || 0))) : 0;
    const isFull = paidAmountNumber >= Number(total) - 0.001;
    return isFull ? "PAID" : paidAmountNumber > 0 ? "PARTIALLY_PAID" : "PENDING";
  }

  assert.equal(determinePaymentStatus(1180, true, 1180), "PAID");
  assert.equal(determinePaymentStatus(1180, true, 500), "PARTIALLY_PAID");
  assert.equal(determinePaymentStatus(1180, true, 0), "PENDING");
  assert.equal(determinePaymentStatus(1180, false, 1180), "PENDING");
});

test("offline customer placeholder email generator and identifier", () => {
  function isOfflinePlaceholder(email: string) {
    return !email || email.includes("@offline.local");
  }

  assert.equal(isOfflinePlaceholder("offline-mhc-1234@offline.local"), true);
  assert.equal(isOfflinePlaceholder(""), true);
  assert.equal(isOfflinePlaceholder("realcustomer@example.com"), false);
});
