export interface InvoiceLineItem {
  id?: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  per: string;
  amount: number;
}

export interface InvoiceCustomerInfo {
  name: string;
  companyName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  gstin?: string;
  customerType?: "B2B" | "B2C";
}

export interface InvoiceBankInfo {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  beneficiaryName: string;
  upiId?: string;
  qrImageUrl?: string;
}

export type InvoiceSizeMode = "AUTO" | "HALF" | "A4";

export interface InvoiceData {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string;
  invoiceDate: string; // DD-MM-YYYY
  challanNumber: string;
  challanDate: string; // DD-MM-YYYY
  orderDate: string; // DD-MM-YYYY
  terms: string;

  sellerGstin: string;
  customer: InvoiceCustomerInfo;
  items: InvoiceLineItem[];

  taxType: "INTRA_STATE" | "INTER_STATE" | "EXEMPT";
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;

  subtotal: number;
  deliveryCharge: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;

  bank: InvoiceBankInfo;
  sizeMode: InvoiceSizeMode;
  resolvedPageSize: "A5" | "A4";
}
