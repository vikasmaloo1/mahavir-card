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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await params;

    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return jsonError("Customer not found", 404);

    const [orderRows, walletRows, billRows] = await Promise.all([
      db.select().from(orders).where(eq(orders.customerId, id)).orderBy(desc(orders.createdAt)),
      db.select().from(walletTransactions).where(eq(walletTransactions.customerId, id)).orderBy(asc(walletTransactions.createdAt)),
      db.select().from(bills).where(eq(bills.customerId, id)).orderBy(desc(bills.invoiceDate)),
    ]);

    const orderIds = orderRows.map((o) => o.id);
    let orderItemsRows: (typeof orderItems.$inferSelect)[] = [];
    let paymentRows: (typeof payments.$inferSelect)[] = [];

    if (orderIds.length > 0) {
      [orderItemsRows, paymentRows] = await Promise.all([
        db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
        db.select().from(payments).where(inArray(payments.orderId, orderIds)),
      ]);
    }

    const orderMap = new Map<string, typeof orderRows[0] & { items: typeof orderItemsRows; payment?: typeof paymentRows[0]; jobNames: string }>();
    const orderNumberMap = new Map<string, typeof orderRows[0] & { items: typeof orderItemsRows; payment?: typeof paymentRows[0]; jobNames: string }>();

    for (const ord of orderRows) {
      const items = orderItemsRows.filter((i) => i.orderId === ord.id);
      const payment = paymentRows.find((p) => p.orderId === ord.id);
      const jobNames = items.map((i) => i.jobName?.trim()).filter(Boolean).join(", ");
      const enriched = { ...ord, items, payment, jobNames };
      orderMap.set(ord.id, enriched);
      if (ord.orderNumber) {
        orderNumberMap.set(ord.orderNumber.toUpperCase().trim(), enriched);
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mahavir Card";
    workbook.created = new Date();

    // ==========================================
    // SHEET 1: ACCOUNT STATEMENT (UNIFIED)
    // ==========================================
    const wsStatement = workbook.addWorksheet("Account Statement", {
      views: [{ showGridLines: true }],
    });

    wsStatement.getColumn(1).width = 18; // Date & Time
    wsStatement.getColumn(2).width = 18; // Voucher / Ref #
    wsStatement.getColumn(3).width = 18; // Type
    wsStatement.getColumn(4).width = 38; // Particulars / Job Name
    wsStatement.getColumn(5).width = 16; // Debit
    wsStatement.getColumn(6).width = 16; // Credit
    wsStatement.getColumn(7).width = 18; // Running Balance
    wsStatement.getColumn(8).width = 32; // Notes / Remarks

    // Header Banner
    const titleRow = wsStatement.addRow(["MAHAVIR CARD - CUSTOMER ACCOUNT STATEMENT"]);
    titleRow.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleRow.height = 32;
    wsStatement.mergeCells("A1:H1");
    titleRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

    const subTitleRow = wsStatement.addRow(["Wholesale & Retail Printing Specialist | Customer Account Ledger"]);
    subTitleRow.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
    subTitleRow.height = 20;
    wsStatement.mergeCells("A2:H2");
    subTitleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

    wsStatement.addRow([]); // Blank line

    // Customer Info Card
    const infoBg = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFF8FAFC" } };
    const addInfoRow = (label1: string, val1: string | number, label2: string, val2: string | number) => {
      const r = wsStatement.addRow(["", label1, val1, "", label2, val2, "", ""]);
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

    const genDateRow = wsStatement.addRow(["", "Generated On:", formatIndianDateTime(new Date()), "", "Credit Status:", customer.creditEnabled ? "Credit Eligible" : "Credit Disabled", "", ""]);
    genDateRow.height = 20;
    genDateRow.getCell(2).font = { bold: true, size: 10, color: { argb: "FF475569" } };
    genDateRow.getCell(3).font = { size: 10, color: { argb: "FF334155" } };
    genDateRow.getCell(5).font = { bold: true, size: 10, color: { argb: "FF475569" } };
    genDateRow.getCell(6).font = { size: 10, color: { argb: "FF334155" } };

    wsStatement.addRow([]); // Blank line

    // Statement Table Header
    const stmHeader = wsStatement.addRow([
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

    // Populate rows in chronological order (earliest to latest)
    for (const tx of walletRows) {
      const txType = String(tx.transactionType || "");
      const txAmt = num(tx.amount);
      const isCredit = ["ADMIN_CREDIT", "TOP_UP", "ORDER_CANCEL_CREDIT", "PAYMENT_CREDIT"].includes(txType);
      const isDebit = ["ADMIN_DEBIT", "CREDIT_ORDER", "WALLET_ORDER", "ADMIN_ADJUSTMENT"].includes(txType);

      const debitVal = isDebit ? txAmt : (txType === "ADMIN_ADJUSTMENT" && txAmt < 0 ? Math.abs(txAmt) : null);
      const creditVal = isCredit ? txAmt : (txType === "ADMIN_ADJUSTMENT" && txAmt > 0 ? txAmt : null);

      if (debitVal) totalDebits += debitVal;
      if (creditVal) totalCredits += creditVal;

      // Find job name if reference corresponds to an order
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

      const dRow = wsStatement.addRow([
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

    // Statement Total Row
    const stmTotal = wsStatement.addRow([
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

    // ==========================================
    // SHEET 2: ORDERS & PRINT JOBS
    // ==========================================
    const wsOrders = workbook.addWorksheet("Orders & Jobs", {
      views: [{ showGridLines: true }],
    });

    wsOrders.getColumn(1).width = 14; // Order Date
    wsOrders.getColumn(2).width = 18; // Order #
    wsOrders.getColumn(3).width = 28; // Job Name (Prominent)
    wsOrders.getColumn(4).width = 38; // Item Description
    wsOrders.getColumn(5).width = 12; // Quantity
    wsOrders.getColumn(6).width = 16; // Order Amount
    wsOrders.getColumn(7).width = 16; // Payment Method
    wsOrders.getColumn(8).width = 16; // Payment Status
    wsOrders.getColumn(9).width = 16; // Order Status
    wsOrders.getColumn(10).width = 20; // Invoice / Chalan

    const ordTitle = wsOrders.addRow([`ORDERS & PRINT JOBS - ${customer.contactName || customer.companyName}`]);
    ordTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    ordTitle.height = 30;
    wsOrders.mergeCells("A1:J1");
    ordTitle.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
    ordTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

    const ordHeader = wsOrders.addRow([
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

      const r = wsOrders.addRow([
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

    // Orders Total Row
    const ordTotal = wsOrders.addRow([
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

    // ==========================================
    // SHEET 3: PAYMENTS & LEDGER
    // ==========================================
    const wsLedger = workbook.addWorksheet("Payments & Ledger", {
      views: [{ showGridLines: true }],
    });

    wsLedger.getColumn(1).width = 20; // Date & Time
    wsLedger.getColumn(2).width = 20; // Transaction Type
    wsLedger.getColumn(3).width = 16; // Amount
    wsLedger.getColumn(4).width = 18; // Balance Before
    wsLedger.getColumn(5).width = 18; // Balance After
    wsLedger.getColumn(6).width = 22; // Reference / UTR
    wsLedger.getColumn(7).width = 38; // Notes

    const ledTitle = wsLedger.addRow([`PAYMENTS & WALLET TRANSACTIONS - ${customer.contactName || customer.companyName}`]);
    ledTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
    ledTitle.height = 30;
    wsLedger.mergeCells("A1:G1");
    ledTitle.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4338CA" } };
    ledTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

    const ledHeader = wsLedger.addRow([
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

    // Sort descending for the payments sheet (latest first)
    const sortedWalletDesc = [...walletRows].reverse();

    for (const tx of sortedWalletDesc) {
      const r = wsLedger.addRow([
        formatIndianDateTime(tx.createdAt),
        tx.transactionType,
        num(tx.amount),
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

    const buffer = await workbook.xlsx.writeBuffer();

    const cleanName = (customer.companyName || customer.contactName || "Customer")
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .slice(0, 40);
    const filename = `Statement_${cleanName}_${formatIndianDate(new Date())}.xlsx`;

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
