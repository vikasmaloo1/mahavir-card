import assert from "node:assert/strict";
import test from "node:test";

import { numberToIndianWords } from "../src/lib/number-to-words";
import { determinePageSize, buildInvoiceData, defaultHsnForDescription, shortenOrderNumber } from "../src/lib/invoice-helper";
import { getFinancialYear, formatInvoiceNumber, parseInvoiceNumber } from "../src/lib/invoice-sequence";

test("getFinancialYear calculates Indian FY (April to March) properly", () => {
  // June 2026 -> 26-27
  assert.equal(getFinancialYear(new Date("2026-06-15T00:00:00Z")), "26-27");
  // September 2026 -> 26-27
  assert.equal(getFinancialYear(new Date("2026-09-09T00:00:00Z")), "26-27");
  // January 2027 -> 26-27 (part of FY 2026-2027)
  assert.equal(getFinancialYear(new Date("2027-01-20T00:00:00Z")), "26-27");
  // March 31, 2027 -> 26-27
  assert.equal(getFinancialYear(new Date("2027-03-31T15:00:00Z")), "26-27");
  // April 1, 2027 -> 27-28
  assert.equal(getFinancialYear(new Date("2027-04-01T12:00:00Z")), "27-28");
});

test("formatInvoiceNumber and parseInvoiceNumber handle MVC/26-27/00001 format correctly", () => {
  assert.equal(formatInvoiceNumber("26-27", 1), "MVC/26-27/00001");
  assert.equal(formatInvoiceNumber("26-27", 42), "MVC/26-27/00042");
  assert.equal(formatInvoiceNumber("27-28", 105), "MVC/27-28/00105");

  const parsed = parseInvoiceNumber("MVC/26-27/00042");
  assert.equal(parsed.year, "26-27");
  assert.equal(parsed.sequence, 42);
});

test("shortenOrderNumber strips excessive prefixes to keep order numbers clean and short", () => {
  assert.equal(shortenOrderNumber("MHC-O-2026-F6014071"), "F6014071");
  assert.equal(shortenOrderNumber("MHC-O-2026-50"), "50");
  assert.equal(shortenOrderNumber("MHC-2026-00123"), "00123");
  assert.equal(shortenOrderNumber("50"), "50");
  assert.equal(shortenOrderNumber(""), "");
});

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

  assert.equal(invoice.invoiceNumber, "MVC/26-27/00001");
  assert.equal(invoice.invoiceYear, "26-27");
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
