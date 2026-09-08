import assert from "node:assert/strict";
import test from "node:test";

import { numberToIndianWords } from "../src/lib/number-to-words";
import { determinePageSize, buildInvoiceData, defaultHsnForDescription } from "../src/lib/invoice-helper";

test("numberToIndianWords formats diverse amounts into standard Indian currency words", () => {
  assert.equal(numberToIndianWords(3009), "Three Thousand Nine Only.");
  assert.equal(numberToIndianWords(2550), "Two Thousand Five Hundred Fifty Only.");
  assert.equal(numberToIndianWords(2550.85), "Two Thousand Five Hundred Fifty Rupees and Eighty Five Paise Only.");
  assert.equal(numberToIndianWords(100000), "One Lakh Only.");
  assert.equal(numberToIndianWords(1050000), "Ten Lakh Fifty Thousand Only.");
  assert.equal(numberToIndianWords(0), "Zero Only.");
});

test("determinePageSize automatically picks A5 for <= 4 items and A4 for > 4 items", () => {
  // AUTO mode:
  assert.equal(determinePageSize(1, "AUTO"), "A5");
  assert.equal(determinePageSize(4, "AUTO"), "A5");
  assert.equal(determinePageSize(5, "AUTO"), "A4");
  assert.equal(determinePageSize(10, "AUTO"), "A4");

  // Explicit overrides:
  assert.equal(determinePageSize(10, "HALF"), "A5");
  assert.equal(determinePageSize(1, "A4"), "A4");
});

test("defaultHsnForDescription assigns 4821 for stickers/labels and 4911 for general printing", () => {
  assert.equal(defaultHsnForDescription("STICKER 10.25 X 2"), "4821");
  assert.equal(defaultHsnForDescription("Custom Product Labels"), "4821");
  assert.equal(defaultHsnForDescription("Matte Visiting Cards 350 GSM"), "4911");
  assert.equal(defaultHsnForDescription("Flyer 130 GSM Art Paper"), "4911");
});

test("buildInvoiceData calculates intra-state taxes, round-off, and grand total accurately", () => {
  const mockOrder = {
    id: "ord-1",
    orderNumber: "MHC-O-2026-00000050",
    createdAt: new Date("2026-06-27T10:00:00Z"),
    deliveryState: "GJ",
    deliveryMethod: "COURIER",
    deliveryPrice: "0.00",
  };
  const mockCustomer = {
    contactName: "Bhavin Patel",
    companyName: "SHREEJI MASALA GRUH UDHYOG BHANDAR",
    phone: "9924403113",
    gstNumber: "24DAFPS4570F1ZM",
    customerType: "B2C",
    city: "Ahmedabad",
    state: "Gujarat",
  };
  const mockItems = [
    {
      id: "item-1",
      description: "STICKER 10.25 X 2",
      quantity: 3000,
      unitPrice: 0.85,
      totalPrice: 2550.00,
    },
  ];

  const invoice = buildInvoiceData(mockOrder, mockCustomer, mockItems);

  assert.equal(invoice.invoiceNumber, "00000050");
  assert.equal(invoice.customer.name, "SHREEJI MASALA GRUH UDHYOG BHANDAR");
  assert.equal(invoice.customer.phone, "9924403113");
  assert.equal(invoice.customer.gstin, "24DAFPS4570F1ZM");

  assert.equal(invoice.subtotal, 2550);
  assert.equal(invoice.taxType, "INTRA_STATE");
  assert.equal(invoice.cgstRate, 9);
  assert.equal(invoice.cgstAmount, 229.5);
  assert.equal(invoice.sgstRate, 9);
  assert.equal(invoice.sgstAmount, 229.5);
  assert.equal(invoice.igstAmount, 0);

  // 2550 + 229.5 + 229.5 = 3009.00
  assert.equal(invoice.grandTotal, 3009.00);
  assert.equal(invoice.amountInWords, "Three Thousand Nine Only.");
  assert.equal(invoice.resolvedPageSize, "A5"); // 1 item -> A5 (Half page)
});
