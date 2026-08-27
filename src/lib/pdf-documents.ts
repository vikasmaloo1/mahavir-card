import "server-only";

import { and, eq, ne } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { db } from "@/lib/db/server";
import { businessSettings, customers, orderItems, orders, payments, quoteItems, quotes, storedDocuments } from "@/lib/db/schema";
import { storeGeneratedDocument } from "@/lib/document-storage";

type PdfLine = { text: string; bold?: boolean; size?: number; gap?: number };

function amount(value: string | number | null | undefined) {
  return `Rs ${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safeText(value: unknown) {
  return String(value ?? "").replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ").trim();
}

function wrap(text: string, max = 88) {
  const words = safeText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > max && line) { lines.push(line); line = word; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function createPdf(title: string, documentNumber: string, lines: PdfLine[]) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  let y = 790;
  const draw = (text: string, options: PdfLine = { text }) => {
    const size = options.size ?? 10;
    for (const value of wrap(text, size >= 18 ? 55 : 88)) {
      if (y < 55) { page = pdf.addPage([595.28, 841.89]); y = 790; }
      page.drawText(value, { x: 48, y, size, font: options.bold ? bold : regular, color: rgb(0.08, 0.14, 0.24) });
      y -= size + 5;
    }
    y -= options.gap ?? 2;
  };
  draw("MAHAVIR CARD", { text: "", bold: true, size: 18, gap: 4 });
  draw(title, { text: "", bold: true, size: 24, gap: 3 });
  draw(documentNumber, { text: "", bold: true, size: 12, gap: 12 });
  for (const line of lines) draw(line.text, line);
  return pdf.save();
}

async function settingsLines() {
  const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1);
  return settings ? [settings.businessName, [settings.addressLine1, settings.addressLine2, settings.city, settings.state, settings.postalCode].filter(Boolean).join(", "), [settings.phone, settings.email].filter(Boolean).join(" | ")].filter(Boolean).map((text) => ({ text: safeText(text), size: 9 })) : [];
}

async function supersedeOlder(document: typeof storedDocuments.$inferSelect) {
  await db.update(storedDocuments).set({ status: "SUPERSEDED", updatedAt: new Date() }).where(and(eq(storedDocuments.documentType, document.documentType), eq(storedDocuments.entityId, document.entityId), ne(storedDocuments.id, document.id), eq(storedDocuments.status, "AVAILABLE")));
}

export async function generateQuoteDocument(quoteId: string, createdBy?: string | null) {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  if (!quote) throw new Error("Quote not found");
  const items = await db.select().from(quoteItems).where(eq(quoteItems.quoteId, quoteId));
  const lines: PdfLine[] = [
    ...(await settingsLines()),
    { text: "", gap: 5 },
    { text: `Prepared for: ${quote.contactName}${quote.companyName ? `, ${quote.companyName}` : ""}`, bold: true },
    { text: `Email: ${quote.email}${quote.phone ? ` | Phone: ${quote.phone}` : ""}` },
    { text: `Status: ${quote.status}${quote.validUntil ? ` | Valid until: ${quote.validUntil.toLocaleDateString("en-IN")}` : ""}`, gap: 10 },
    { text: "ITEMS", bold: true, size: 12 },
    ...items.flatMap((item, index) => [
      { text: `${index + 1}. ${item.jobName ? `${item.jobName} - ` : ""}${item.description}`, bold: true },
      { text: `Quantity: ${item.quantity} | Unit: ${amount(item.unitPrice)} | Total: ${amount(item.totalPrice)}`, gap: 5 },
    ]),
    { text: "TOTALS", bold: true, size: 12 },
    { text: `Subtotal: ${amount(quote.subtotal)}` },
    { text: `Discount: ${amount(quote.discountAmount)}` },
    { text: `GST / Tax: ${amount(quote.tax)}` },
    { text: `Quotation total: ${amount(quote.total)}`, bold: true, size: 13 },
    ...(quote.customerMessage ? [{ text: `Message: ${quote.customerMessage}`, gap: 8 }] : []),
    { text: "All prices and taxes are shown as recorded in this quotation." },
  ];
  const bytes = await createPdf("QUOTATION", quote.quoteNumber, lines);
  const document = await storeGeneratedDocument({ documentType: "QUOTE", entityType: "QUOTE", entityId: quote.id, customerId: quote.customerId, quoteId: quote.id, filename: `quotation-${quote.quoteNumber}.pdf`, bytes, createdBy });
  await supersedeOlder(document);
  return document;
}

export async function generateInvoiceDocument(orderId: string, createdBy?: string | null) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order not found");
  if (!order.customerId) throw new Error("An invoice requires an order customer");
  const [items, customerRows, paymentRows] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, orderId)),
    db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1),
    db.select().from(payments).where(eq(payments.orderId, orderId)).limit(1),
  ]);
  const customer = customerRows[0];
  const payment = paymentRows[0];
  const lines: PdfLine[] = [
    ...(await settingsLines()),
    { text: "", gap: 5 },
    { text: `Billed to: ${customer?.contactName ?? "Customer"}${customer?.companyName ? `, ${customer.companyName}` : ""}`, bold: true },
    { text: [customer?.email, customer?.phone].filter(Boolean).join(" | ") },
    { text: `Order status: ${order.status}${payment ? ` | Payment: ${payment.status} (${payment.method})` : ""}`, gap: 10 },
    { text: "ITEMS", bold: true, size: 12 },
    ...items.flatMap((item, index) => [
      { text: `${index + 1}. ${item.jobName ? `${item.jobName} - ` : ""}${item.description}`, bold: true },
      { text: `Quantity: ${item.quantity} | Unit: ${amount(item.unitPrice)} | Total: ${amount(item.totalPrice)}`, gap: 5 },
    ]),
    { text: "TOTALS", bold: true, size: 12 },
    { text: `Subtotal: ${amount(order.subtotal)}` },
    { text: `Delivery: ${amount(order.deliveryPrice)}` },
    { text: `GST / Tax: ${amount(order.tax)}` },
    { text: `Invoice total: ${amount(order.total)}`, bold: true, size: 13 },
    { text: "This invoice is generated from the recorded order and payment details." },
  ];
  const bytes = await createPdf("INVOICE", order.orderNumber, lines);
  const document = await storeGeneratedDocument({ documentType: "INVOICE", entityType: "ORDER", entityId: order.id, customerId: order.customerId, orderId: order.id, filename: `invoice-${order.orderNumber}.pdf`, bytes, createdBy });
  await supersedeOlder(document);
  return document;
}
