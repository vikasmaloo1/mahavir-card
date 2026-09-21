import { asc, desc, eq, inArray } from "drizzle-orm";
import ExcelJS from "exceljs";

import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { bills, customers, orderItems, orders, payments, walletTransactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

function formatIndianDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return String(d);
  }
}

function formatIndianDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, "0");
    return `${day}-${month}-${year} ${strHours}:${minutes} ${ampm}`;
  } catch {
    return String(d);
  }
}

function num(v: string | number | null | undefined): number {
  return Number(v ?? 0);
}

function applyCurrencyCols(row: ExcelJS.Row, cols: number[]) {
  cols.forEach((col) => {
    const c = row.getCell(col);
    if (typeof c.value === "number") {
      c.numFmt = "₹#,##0.00";
      c.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}

function setThinBorders(row: ExcelJS.Row, fromCol: number, toCol: number) {
  for (let c = fromCol; c <= toCol; c++) {
    const cell = row.getCell(c);
    cell.border = {
      top: { style: "thin", color: { argb: "FFE2E8F0" } },
      bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
      left: { style: "thin", color: { argb: "FFE2E8F0" } },
      right: { style: "thin", color: { argb: "FFE2E8F0" } },
    };
  }
}

type CustomerRecord = typeof customers.$inferSelect;
type OrderRecord = typeof orders.$inferSelect;
type OrderItemRecord = typeof orderItems.$inferSelect;
type PaymentRecord = typeof payments.$inferSelect;
type WalletRecord = typeof walletTransactions.$inferSelect;

function addCustomerHeaderCard(ws: ExcelJS.Worksheet, customer: CustomerRecord, endColLetter: string, endColNum: number) {
  const infoBg = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF8FAFC" } };
  const addInfoRow = (label1: string, val1: string | number, label2: string, val2: string | number) => {
    const r = ws.addRow(["", label1, val1, "", label2, val2]);
    r.height = 20;
    r.getCell(2).font = { bold: true, size: 10, color: { argb: "FF475569" } };
    r.getCell(3).font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
    r.getCell(5).font = { bold: true, size: 10, color: { argb: "FF475569" } };
    r.getCell(6).font = { bold: true, size: 10, color: { argb: "FF0F172A" } };
    r.getCell(2).fill = infoBg;
    r.getCell(3).fill = infoBg;
    r.getCell(5).fill = infoBg;
    r.getCell(6).fill = infoBg;
    return r;
  };

  addInfoRow("Customer Name:", customer.contactName || "-", "Account Type:", `${customer.customerType || "B2B"} Customer`);
  addInfoRow("Company Name:", customer.companyName || "-", "GSTIN:", customer.gstNumber || "Unregistered");
  addInfoRow("Mobile / Phone:", customer.phone || "-", "City / State:", `${customer.city || "-"}, ${customer.state || "-"}`);
  const balRow = addInfoRow(
    "Credit Limit:",
    `₹${Number(customer.creditLimit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    "Current Balance:",
    `₹${Number(customer.availableCredit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
  );
  balRow.getCell(6).font = {
    bold: true,
    size: 11,
    color: { argb: Number(customer.availableCredit || 0) < 0 ? "FFDC2626" : "FF16A34A" },
  };

  const genDateRow = ws.addRow(["", "Generated On:", formatIndianDateTime(new Date()), "", "Credit Status:", customer.creditEnabled ? "Credit Eligible" : "Credit Disabled"]);
  genDateRow.height = 20;
  genDateRow.getCell(2).font = { bold: true, size: 10, color: { argb: "FF475569" } };
  genDateRow.getCell(3).font = { size: 10, color: { argb: "FF334155" } };
  genDateRow.getCell(5).font = { bold: true, size: 10, color: { argb: "FF475569" } };
  genDateRow.getCell(6).font = { size: 10, color: { argb: "FF334155" } };
}

// 1. Account Statement Sheet Builder
function buildStatementSheet(
  workbook: ExcelJS.Workbook,
  customer: CustomerRecord,
  walletRows: WalletRecord[],
  orderNumberMap: Map<string, OrderRecord & { items: OrderItemRecord[]; payment?: PaymentRecord; jobNames: string }>
) {
  const ws = workbook.addWorksheet("Account Statement", {
    views: [{ showGridLines: true }],
  });

  ws.getColumn(1).width = 18; // Date & Time
  ws.getColumn(2).width = 18; // Voucher / Ref #
  ws.getColumn(3).width = 18; // Type
  ws.getColumn(4).width = 38; // Particulars / Job Name
  ws.getColumn(5).width = 16; // Debit
  ws.getColumn(6).width = 16; // Credit
  ws.getColumn(7).width = 18; // Running Balance
  ws.getColumn(8).width = 32; // Notes / Remarks

  // Header Banner
  const titleRow = ws.addRow(["MAHAVIR CARD - CUSTOMER ACCOUNT STATEMENT"]);
  titleRow.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleRow.height = 32;
  ws.mergeCells("A1:H1");
  titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subTitleRow = ws.addRow(["Wholesale & Retail Printing Specialist | Customer Account Ledger"]);
  subTitleRow.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
  subTitleRow.height = 20;
  ws.mergeCells("A2:H2");
  subTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  ws.addRow([]); // Blank line

  // Customer Info
  addCustomerHeaderCard(ws, customer, "H", 8);

  ws.addRow([]); // Blank line

  // Statement Table Header
  const stmHeader = ws.addRow([
    "Date & Time",
    "Voucher / Ref #",
    "Type",
    "Particulars / Job Name",
    "Debit (Charges)",
    "Credit (Payments)",
    "Running Balance",
    "Notes / Remarks",
  ]);
  stmHeader.height = 25;
  stmHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  let totalDebits = 0;
  let totalCredits = 0;

  for (const tx of walletRows) {
    const txType = String(tx.transactionType || "");
    const txAmt = num(tx.amount);
    const isCredit = ["ADMIN_CREDIT", "TOP_UP", "ORDER_CANCEL_CREDIT", "PAYMENT_CREDIT"].includes(txType);
    const isDebit = ["ADMIN_DEBIT", "CREDIT_ORDER", "WALLET_ORDER", "ADMIN_ADJUSTMENT"].includes(txType);

    const debitVal = isDebit ? txAmt : (txType === "ADMIN_ADJUSTMENT" && txAmt < 0 ? Math.abs(txAmt) : null);
    const creditVal = isCredit ? txAmt : (txType === "ADMIN_ADJUSTMENT" && txAmt > 0 ? txAmt : null);

    if (debitVal) totalDebits += debitVal;
    if (creditVal) totalCredits += creditVal;

    let jobNameOrDesc = "";
    const refStr = (tx.reference || "").toUpperCase().trim();
    if (refStr && orderNumberMap.has(refStr)) {
      const matchingOrder = orderNumberMap.get(refStr)!;
      jobNameOrDesc = matchingOrder.jobNames ? `Job: ${matchingOrder.jobNames}` : `Order #${matchingOrder.orderNumber}`;
    } else if (txType === "ADMIN_CREDIT") {
      jobNameOrDesc = "Payment / Deposit Received";
    } else if (txType === "TOP_UP") {
      jobNameOrDesc = "Storefront Top-Up";
    } else if (txType === "ORDER_CANCEL_CREDIT") {
      jobNameOrDesc = "Refund / Order Cancellation Credit";
    } else if (txType === "PAYMENT_CREDIT") {
      jobNameOrDesc = "Payment Received against Order";
    } else {
      jobNameOrDesc = tx.notes || txType;
    }

    const balAfterNum = tx.balanceAfter !== null && tx.balanceAfter !== undefined ? num(tx.balanceAfter) : null;

    const dRow = ws.addRow([
      formatIndianDateTime(tx.createdAt),
      tx.reference || "-",
      txType,
      jobNameOrDesc,
      debitVal,
      creditVal,
      balAfterNum,
      tx.notes || "-",
    ]);

    dRow.height = 20;
    dRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    dRow.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    dRow.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    dRow.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
    dRow.getCell(8).alignment = { horizontal: "left", vertical: "middle" };

    applyCurrencyCols(dRow, [5, 6, 7]);
    setThinBorders(dRow, 1, 8);
  }

  // Total row
  const stmTotal = ws.addRow([
    "TOTAL",
    "",
    "",
    `${walletRows.length} Transactions Recorded`,
    totalDebits,
    totalCredits,
    num(customer.availableCredit),
    "Closing Balance",
  ]);
  stmTotal.height = 25;
  stmTotal.eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { horizontal: col >= 5 && col <= 7 ? "right" : "center", vertical: "middle" };
  });
  applyCurrencyCols(stmTotal, [5, 6, 7]);
}

// 2. Orders & Jobs Sheet Builder
function buildOrdersSheet(
  workbook: ExcelJS.Workbook,
  customer: CustomerRecord,
  orderRows: OrderRecord[],
  orderItemsRows: OrderItemRecord[],
  paymentRows: PaymentRecord[]
) {
  const ws = workbook.addWorksheet("Orders & Jobs", {
    views: [{ showGridLines: true }],
  });

  ws.getColumn(1).width = 14; // Order Date
  ws.getColumn(2).width = 18; // Order #
  ws.getColumn(3).width = 28; // Job Name (Prominent)
  ws.getColumn(4).width = 38; // Item Description
  ws.getColumn(5).width = 12; // Quantity
  ws.getColumn(6).width = 16; // Order Amount
  ws.getColumn(7).width = 16; // Payment Method
  ws.getColumn(8).width = 16; // Payment Status
  ws.getColumn(9).width = 16; // Order Status
  ws.getColumn(10).width = 20; // Invoice / Chalan

  const ordTitle = ws.addRow([`MAHAVIR CARD - ORDERS & PRINT JOBS STATEMENT`]);
  ordTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  ordTitle.height = 30;
  ws.mergeCells("A1:J1");
  ordTitle.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  ordTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subTitleRow = ws.addRow([`Customer: ${customer.contactName || ""} ${customer.companyName ? `(${customer.companyName})` : ""} | GST: ${customer.gstNumber || "Unregistered"} | Phone: ${customer.phone || "-"}`]);
  subTitleRow.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
  subTitleRow.height = 20;
  ws.mergeCells("A2:J2");
  subTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  ws.addRow([]); // Blank line

  const ordHeader = ws.addRow([
    "Order Date",
    "Order #",
    "Job Name",
    "Items / Description",
    "Qty",
    "Order Total",
    "Payment Mode",
    "Payment Status",
    "Order Status",
    "Tax Invoice #",
  ]);
  ordHeader.height = 24;
  ordHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  let totalOrderValue = 0;
  let totalOrderQty = 0;

  for (const ord of orderRows) {
    const items = orderItemsRows.filter((i) => i.orderId === ord.id);
    const payment = paymentRows.find((p) => p.orderId === ord.id);
    const ordAmt = num(ord.total);
    totalOrderValue += ordAmt;

    const jobNames = items.map((i) => i.jobName?.trim()).filter(Boolean).join(", ") || "-";
    const descriptions = items.map((i) => i.description?.trim()).filter(Boolean).join("; ") || "Print Job";
    const totalQty = items.reduce((acc, i) => acc + (Number(i.quantity) || 0), 0);
    totalOrderQty += totalQty;

    const r = ws.addRow([
      formatIndianDate(ord.createdAt),
      ord.orderNumber,
      jobNames,
      descriptions,
      totalQty > 0 ? totalQty : "-",
      ordAmt,
      payment?.method || (ord.status === "DELIVERED" ? "B2B Credit" : "-"),
      payment?.status || (ord.status === "DELIVERED" ? "PAID" : "PENDING"),
      ord.status || "PENDING",
      ord.invoiceNumber || ord.chalanNumber || "-",
    ]);

    r.height = 20;
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(3).font = { bold: true, color: { argb: "FF0F766E" } };
    r.getCell(3).alignment = { horizontal: "left", vertical: "middle" };
    r.getCell(4).alignment = { horizontal: "left", vertical: "middle" };
    r.getCell(5).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(7).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

    applyCurrencyCols(r, [6]);
    setThinBorders(r, 1, 10);
  }

  // Total row
  const ordTotal = ws.addRow([
    "TOTAL",
    `${orderRows.length} Orders`,
    "",
    "",
    totalOrderQty,
    totalOrderValue,
    "",
    "",
    "",
    "",
  ]);
  ordTotal.height = 24;
  ordTotal.eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF134E4A" } };
    cell.alignment = { horizontal: col === 6 ? "right" : "center", vertical: "middle" };
  });
  applyCurrencyCols(ordTotal, [6]);
}

// 3. Payments & Ledger Sheet Builder
function buildLedgerSheet(
  workbook: ExcelJS.Workbook,
  customer: CustomerRecord,
  walletRows: WalletRecord[]
) {
  const ws = workbook.addWorksheet("Payments & Ledger", {
    views: [{ showGridLines: true }],
  });

  ws.getColumn(1).width = 20; // Date & Time
  ws.getColumn(2).width = 20; // Transaction Type
  ws.getColumn(3).width = 16; // Amount
  ws.getColumn(4).width = 18; // Balance Before
  ws.getColumn(5).width = 18; // Balance After
  ws.getColumn(6).width = 22; // Reference / UTR
  ws.getColumn(7).width = 38; // Notes

  const ledTitle = ws.addRow([`MAHAVIR CARD - PAYMENTS & WALLET TRANSACTIONS`]);
  ledTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  ledTitle.height = 30;
  ws.mergeCells("A1:G1");
  ledTitle.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
  ledTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  const subTitleRow = ws.addRow([`Customer: ${customer.contactName || ""} ${customer.companyName ? `(${customer.companyName})` : ""} | Current Balance: ₹${Number(customer.availableCredit || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`]);
  subTitleRow.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
  subTitleRow.height = 20;
  ws.mergeCells("A2:G2");
  subTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

  ws.addRow([]); // Blank line

  const ledHeader = ws.addRow([
    "Date & Time",
    "Transaction Type",
    "Amount",
    "Balance Before",
    "Balance After",
    "Reference / UTR",
    "Notes / Description",
  ]);
  ledHeader.height = 24;
  ledHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const sortedWalletDesc = [...walletRows].reverse();
  let totalPayments = 0;

  for (const tx of sortedWalletDesc) {
    const amt = num(tx.amount);
    const isCredit = ["ADMIN_CREDIT", "TOP_UP", "ORDER_CANCEL_CREDIT", "PAYMENT_CREDIT"].includes(String(tx.transactionType));
    if (isCredit) totalPayments += amt;

    const r = ws.addRow([
      formatIndianDateTime(tx.createdAt),
      tx.transactionType,
      amt,
      tx.balanceBefore !== null && tx.balanceBefore !== undefined ? num(tx.balanceBefore) : "-",
      tx.balanceAfter !== null && tx.balanceAfter !== undefined ? num(tx.balanceAfter) : "-",
      tx.reference || "-",
      tx.notes || "-",
    ]);

    r.height = 20;
    r.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    r.getCell(7).alignment = { horizontal: "left", vertical: "middle" };

    applyCurrencyCols(r, [3, 4, 5]);
    setThinBorders(r, 1, 7);
  }

  // Total row
  const ledTotal = ws.addRow([
    "TOTAL",
    `${walletRows.length} Transactions`,
    totalPayments,
    "",
    num(customer.availableCredit),
    "",
    "Net Balance",
  ]);
  ledTotal.height = 24;
  ledTotal.eachCell((cell, col) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF312E81" } };
    cell.alignment = { horizontal: col === 3 || col === 5 ? "right" : "center", vertical: "middle" };
  });
  applyCurrencyCols(ledTotal, [3, 5]);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const requestedTab = (searchParams.get("tab") || "ALL").toUpperCase().trim();

    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return jsonError("Customer not found", 404);

    const [orderRows, walletRows, billRows] = await Promise.all([
      db.select().from(orders).where(eq(orders.customerId, id)).orderBy(desc(orders.createdAt)),
      db.select().from(walletTransactions).where(eq(walletTransactions.customerId, id)).orderBy(asc(walletTransactions.createdAt)),
      db.select().from(bills).where(eq(bills.customerId, id)).orderBy(desc(bills.invoiceDate)),
    ]);

    const orderIds = orderRows.map((o) => o.id);
    let orderItemsRows: OrderItemRecord[] = [];
    let paymentRows: PaymentRecord[] = [];

    if (orderIds.length > 0) {
      [orderItemsRows, paymentRows] = await Promise.all([
        db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
        db.select().from(payments).where(inArray(payments.orderId, orderIds)),
      ]);
    }

    const orderNumberMap = new Map<string, OrderRecord & { items: OrderItemRecord[]; payment?: PaymentRecord; jobNames: string }>();

    for (const ord of orderRows) {
      const items = orderItemsRows.filter((i) => i.orderId === ord.id);
      const payment = paymentRows.find((p) => p.orderId === ord.id);
      const jobNames = items.map((i) => i.jobName?.trim()).filter(Boolean).join(", ");
      const enriched = { ...ord, items, payment, jobNames };
      if (ord.orderNumber) {
        orderNumberMap.set(ord.orderNumber.toUpperCase().trim(), enriched);
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mahavir Card";
    workbook.created = new Date();

    const cleanName = (customer.companyName || customer.contactName || "Customer")
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .slice(0, 40);
    const dateSuffix = formatIndianDate(new Date());

    let filename = "";

    if (requestedTab === "ORDERS") {
      buildOrdersSheet(workbook, customer, orderRows, orderItemsRows, paymentRows);
      filename = `Orders_and_Jobs_${cleanName}_${dateSuffix}.xlsx`;
    } else if (requestedTab === "LEDGER") {
      buildLedgerSheet(workbook, customer, walletRows);
      filename = `Payments_and_Ledger_${cleanName}_${dateSuffix}.xlsx`;
    } else if (requestedTab === "STATEMENT") {
      buildStatementSheet(workbook, customer, walletRows, orderNumberMap);
      filename = `Account_Statement_${cleanName}_${dateSuffix}.xlsx`;
    } else {
      // ALL / FULL: Build all 3 sheets in one workbook
      buildStatementSheet(workbook, customer, walletRows, orderNumberMap);
      buildOrdersSheet(workbook, customer, orderRows, orderItemsRows, paymentRows);
      buildLedgerSheet(workbook, customer, walletRows);
      filename = `Complete_Statement_${cleanName}_${dateSuffix}.xlsx`;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
