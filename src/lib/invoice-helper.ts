import { numberToIndianWords } from "./number-to-words";
import type { InvoiceData, InvoiceLineItem, InvoiceSizeMode } from "./invoice-types";

function formatDateIn(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function determinePageSize(itemCount: number, mode: InvoiceSizeMode = "AUTO"): "A5" | "A4" {
  if (mode === "HALF") return "A5";
  if (mode === "A4") return "A4";
  return itemCount <= 4 ? "A5" : "A4";
}

export function defaultHsnForDescription(desc: string): string {
  const lower = desc.toLowerCase();
  if (lower.includes("sticker") || lower.includes("label") || lower.includes("adhesive") || lower.includes("sheet")) {
    return "4821"; // Paper labels and stickers
  }
  return "4911"; // Printed materials / trade advertising / visiting cards
}

export function buildInvoiceData(
  order: any,
  customer: any,
  items: any[],
  settings?: any,
  overrides?: Partial<InvoiceData> & { customItems?: InvoiceLineItem[] }
): InvoiceData {
  const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const formattedOrderDate = formatDateIn(createdDate);

  // Derive default invoice number: clean readable sequence (or extract last 4 digits)
  const defaultInvNum = overrides?.invoiceNumber || (order.orderNumber ? order.orderNumber.replace(/^MHC-O-\d+-/, "") : "50");

  const lineItems: InvoiceLineItem[] = (overrides?.customItems || items || []).map((item, index) => {
    const qty = Number(item.quantity || 1);
    const rate = Number(item.unitPrice ?? item.rate ?? 0);
    const amount = Number(item.totalPrice ?? item.amount ?? (qty * rate));
    return {
      id: item.id || `item-${index + 1}`,
      description: String(item.jobName ? `${item.jobName} - ${item.description}` : item.description || "PRINTING WORK").toUpperCase(),
      hsnCode: item.hsnCode || defaultHsnForDescription(item.description || ""),
      quantity: qty,
      rate: rate,
      per: item.per || "PCS.",
      amount: Number(amount.toFixed(2)),
    };
  });

  const subtotal = lineItems.reduce((acc, it) => acc + it.amount, 0);

  const isIntraState = overrides?.taxType
    ? overrides.taxType === "INTRA_STATE"
    : order.taxType === "INTRA_STATE" || order.deliveryState === "GJ" || order.deliveryMethod === "PICKUP" || !order.deliveryState;

  const cgstRate = overrides?.cgstRate !== undefined ? Number(overrides.cgstRate) : isIntraState ? 9 : 0;
  const sgstRate = overrides?.sgstRate !== undefined ? Number(overrides.sgstRate) : isIntraState ? 9 : 0;
  const igstRate = overrides?.igstRate !== undefined ? Number(overrides.igstRate) : !isIntraState ? 18 : 0;

  const cgstAmount = Number(((subtotal * cgstRate) / 100).toFixed(2));
  const sgstAmount = Number(((subtotal * sgstRate) / 100).toFixed(2));
  const igstAmount = Number(((subtotal * igstRate) / 100).toFixed(2));

  const totalTaxes = cgstAmount + sgstAmount + igstAmount;
  const deliveryCharge = Number(overrides?.deliveryCharge ?? order.deliveryPrice ?? 0);
  const rawTotal = subtotal + totalTaxes + deliveryCharge;

  const roundOff = overrides?.roundOff !== undefined
    ? Number(overrides.roundOff)
    : Number((Math.round(rawTotal) - rawTotal).toFixed(2));

  const grandTotal = Number((rawTotal + roundOff).toFixed(2));
  const amountInWords = numberToIndianWords(grandTotal);

  const sizeMode: InvoiceSizeMode = overrides?.sizeMode || "AUTO";
  const resolvedPageSize = determinePageSize(lineItems.length, sizeMode);

  // Address parsing
  const addr = order.deliveryAddress || {};
  const custAddrLine1 = addr.line1 || customer?.city || "";
  const custAddrLine2 = [addr.line2, addr.city, addr.postalCode].filter(Boolean).join(", ") || customer?.state || "";

  return {
    orderId: String(order.id),
    orderNumber: String(order.orderNumber),
    invoiceNumber: String(overrides?.invoiceNumber || defaultInvNum),
    invoiceDate: overrides?.invoiceDate || formattedOrderDate,
    challanNumber: String(overrides?.challanNumber || defaultInvNum),
    challanDate: overrides?.challanDate || formattedOrderDate,
    orderDate: overrides?.orderDate || formattedOrderDate,
    terms: overrides?.terms || "Immediate",

    sellerGstin: overrides?.sellerGstin || settings?.gstNumber || "24AIUPJ2271L1ZV",
    customer: {
      name: overrides?.customer?.name || customer?.companyName || customer?.contactName || "Walk-In Customer",
      companyName: customer?.companyName,
      addressLine1: overrides?.customer?.addressLine1 || custAddrLine1,
      addressLine2: overrides?.customer?.addressLine2 || custAddrLine2,
      city: overrides?.customer?.city || addr.city || customer?.city || "Ahmedabad",
      state: overrides?.customer?.state || addr.state || customer?.state || "Gujarat",
      postalCode: overrides?.customer?.postalCode || addr.postalCode,
      phone: overrides?.customer?.phone || customer?.phone || "",
      gstin: overrides?.customer?.gstin || customer?.gstNumber || "",
      customerType: customer?.customerType || "B2C",
    },
    items: lineItems,

    taxType: overrides?.taxType || (isIntraState ? "INTRA_STATE" : "INTER_STATE"),
    cgstRate,
    cgstAmount,
    sgstRate,
    sgstAmount,
    igstRate,
    igstAmount,

    subtotal: Number(subtotal.toFixed(2)),
    deliveryCharge,
    roundOff,
    grandTotal,
    amountInWords,

    bank: {
      bankName: overrides?.bank?.bankName || settings?.b2cBankName || "BANK OF BARODA",
      accountNumber: overrides?.bank?.accountNumber || settings?.b2cBankAccountNumber || "03280200003947",
      ifscCode: overrides?.bank?.ifscCode || settings?.b2cBankIfsc || "BARB0GANAHM",
      beneficiaryName: overrides?.bank?.beneficiaryName || settings?.b2cBankBeneficiary || "MAHAVIR CARD",
      upiId: overrides?.bank?.upiId || settings?.b2cUpiId || "mahavircard2011-2@oksbi",
      qrImageUrl: overrides?.bank?.qrImageUrl || settings?.b2cQrImageUrl || "/images/qr/b2c-qr.jpg",
    },
    sizeMode,
    resolvedPageSize,
  };
}
