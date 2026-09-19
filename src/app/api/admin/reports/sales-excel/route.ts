import { and, between, desc, eq, inArray, isNotNull } from "drizzle-orm";
import ExcelJS from "exceljs";
import { handleApiError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { bills, customers, orderItems, orders, purchases } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

function fmt(v: string | number | null | undefined): number {
  return Number(v ?? 0);
}

function formatIndianDate(d: Date | string): string {
  const date = new Date(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function makeTitle(sectionType: "SALE" | "PURCHASE", variant: string, from: Date, to: Date): string {
  const months = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const isSameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const periodStr = isSameMonth ? `${months[from.getMonth()]} ${from.getFullYear()}` : `${formatIndianDate(from)} TO ${formatIndianDate(to)}`;
  
  if (sectionType === "PURCHASE") {
    return `PURCHASE ${periodStr}`;
  }
  return `SALE ${periodStr}(${variant || "B2C"})`;
}

function getDateRange(period: string, dateFrom: string, dateTo: string): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "daily") {
    const d = dateFrom ? new Date(dateFrom) : today;
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    return { from: d, to: end };
  }
  if (period === "weekly") {
    let start = today;
    if (dateFrom) { start = new Date(dateFrom); }
    else {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(today.setDate(diff));
    }
    const end = dateTo ? new Date(dateTo) : new Date(start);
    if (!dateTo) { end.setDate(start.getDate() + 6); }
    end.setHours(23, 59, 59, 999);
    return { from: start, to: end };
  }
  if (period === "monthly") {
    let from: Date, to: Date;
    if (dateFrom) {
      const d = new Date(dateFrom);
      from = new Date(d.getFullYear(), d.getMonth(), 1);
      to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }
    return { from, to };
  }
  // custom
  const from = dateFrom ? new Date(dateFrom) : new Date(now.getFullYear(), 0, 1);
  const to = dateTo ? new Date(dateTo) : now;
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function applyNumberCols(row: ExcelJS.Row, cols: number[]) {
  cols.forEach((col) => {
    const c = row.getCell(col);
    if (typeof c.value === "number") {
      c.numFmt = "#,##0.00";
      c.alignment = { horizontal: "right", vertical: "middle" };
    }
  });
}

function applySheetColumnWidths(ws: ExcelJS.Worksheet) {
  ws.getColumn(1).width = 14;  // DATE
  ws.getColumn(2).width = 36;  // PARTY NAME
  ws.getColumn(3).width = 10;  // QTY.
  ws.getColumn(4).width = 12;  // BILL NO
  ws.getColumn(5).width = 12;  // HSN CODE
  ws.getColumn(6).width = 14;  // TAX VALUE
  ws.getColumn(7).width = 12;  // C.GST / CGST
  ws.getColumn(8).width = 12;  // SGST
  ws.getColumn(9).width = 12;  // IGST
  ws.getColumn(10).width = 10; // R OFF
  ws.getColumn(11).width = 15; // TOTAL VALUE
  ws.getColumn(12).width = 10; // RATE %
  ws.getColumn(13).width = 22; // PARTY GSTIN
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);

    // type can be: "COMBINED" (default / sales+purchase in one tab), "B2C", "B2B", "PURCHASE"
    const type = (searchParams.get("type") || "COMBINED").toUpperCase();
    const period = searchParams.get("period") || "monthly";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const { from, to } = getDateRange(period, dateFrom, dateTo);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mahavir Card Admin";
    workbook.created = new Date();

    // ── Helper to render Sales Table onto a Worksheet ───────────────────────
    async function renderSalesTable(ws: ExcelJS.Worksheet, saleVariant: "B2C" | "B2B") {
      // 1. Fetch Manual Store Bills
      // Rule: "manually added store bills too show it in reports. store bills are b2c always"
      const allBills = await db.select().from(bills)
        .where(between(bills.invoiceDate, from, to))
        .orderBy(desc(bills.invoiceDate));

      // 2. Fetch Store Orders Invoices
      const allOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          invoiceNumber: orders.invoiceNumber,
          invoiceSequence: orders.invoiceSequence,
          invoiceDate: orders.invoiceDate,
          createdAt: orders.createdAt,
          subtotal: orders.subtotal,
          cgstAmount: orders.cgstAmount,
          sgstAmount: orders.sgstAmount,
          igstAmount: orders.igstAmount,
          taxRate: orders.taxRate,
          total: orders.total,
          companyName: customers.companyName,
          contactName: customers.contactName,
          gstNumber: customers.gstNumber,
          customerType: customers.customerType,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customerId, customers.id))
        .where(
          and(
            isNotNull(orders.invoiceNumber),
            between(orders.invoiceDate, from, to)
          )
        )
        .orderBy(desc(orders.invoiceDate));

      const orderIds = allOrders.map((o) => o.id);
      const orderItemsMap = new Map<string, { qty: number; hsnCode: string }>();
      if (orderIds.length > 0) {
        const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
        for (const it of items) {
          const prev = orderItemsMap.get(it.orderId) || { qty: 0, hsnCode: "4802" };
          prev.qty += Number(it.quantity || 0);
          orderItemsMap.set(it.orderId, prev);
        }
      }

      type SaleRow = {
        date: Date;
        partyName: string;
        qty: number | null;
        billNo: string;
        hsnCode: string;
        taxValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        roundOff: number;
        totalValue: number;
        rate: number;
        partyGstin: string;
      };

      const saleRows: SaleRow[] = [];

      for (const b of allBills) {
        const hasGstin = Boolean(b.gstin && b.gstin.trim().length > 5);
        if (saleVariant === "B2C" || (saleVariant === "B2B" && hasGstin)) {
          const items = Array.isArray(b.items) ? (b.items as Array<{ quantity?: number; hsnCode?: string }>) : [];
          const totalQty = items.reduce((s, it) => s + Number(it.quantity || 0), 0);
          const hsnCode = items.length > 0 ? (items[0].hsnCode || "4802") : "4802";
          const gstRate = fmt(b.cgstRate) + fmt(b.sgstRate) + fmt(b.igstRate);

          saleRows.push({
            date: new Date(b.invoiceDate),
            partyName: (b.companyName || b.customerName || "RETAIL CUSTOMER").toUpperCase(),
            qty: totalQty > 0 ? totalQty : null,
            billNo: b.invoiceSequence ? String(b.invoiceSequence) : (b.invoiceNumber || ""),
            hsnCode,
            taxValue: fmt(b.subtotal),
            cgst: fmt(b.cgstAmount),
            sgst: fmt(b.sgstAmount),
            igst: fmt(b.igstAmount),
            roundOff: fmt(b.roundOff),
            totalValue: fmt(b.grandTotal),
            rate: gstRate,
            partyGstin: b.gstin || "",
          });
        }
      }

      for (const o of allOrders) {
        const isB2B = o.customerType === "B2B" || Boolean(o.gstNumber && o.gstNumber.trim().length > 5);
        if ((saleVariant === "B2C" && !isB2B) || (saleVariant === "B2B" && isB2B)) {
          const itemMeta = orderItemsMap.get(o.id);
          const totalQty = itemMeta?.qty || null;
          const hsnCode = itemMeta?.hsnCode || "4802";
          const tv = fmt(o.subtotal);
          const cgst = fmt(o.cgstAmount);
          const sgst = fmt(o.sgstAmount);
          const igst = fmt(o.igstAmount);
          const tot = fmt(o.total);
          const rawTotal = tv + cgst + sgst + igst;
          const ro = Number((tot - rawTotal).toFixed(2));
          const rate = fmt(o.taxRate) || (cgst > 0 ? 18 : 0);

          saleRows.push({
            date: new Date(o.invoiceDate || o.createdAt),
            partyName: (o.companyName || o.contactName || "ONLINE CUSTOMER").toUpperCase(),
            qty: totalQty,
            billNo: o.invoiceSequence ? String(o.invoiceSequence) : (o.invoiceNumber || o.orderNumber),
            hsnCode,
            taxValue: tv,
            cgst,
            sgst,
            igst,
            roundOff: ro,
            totalValue: tot,
            rate,
            partyGstin: o.gstNumber || "",
          });
        }
      }

      saleRows.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Title row: e.g. SALE JUNE 2026(B2C)
      const titleRow = ws.addRow([]);
      const titleRowIdx = titleRow.number;
      ws.mergeCells(`B${titleRowIdx}:G${titleRowIdx}`);
      const titleCell = ws.getCell(`B${titleRowIdx}`);
      titleCell.value = makeTitle("SALE", saleVariant, from, to);
      titleCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3EA7C1" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleRow.height = 28;

      // Header row
      const headers = ["DATE", "PARTY NAME", "QTY.", "BILL NO", "HSN CODE", "TAX VALUE", "C.GST", "SGST", "IGST", "R OFF", "TOTAL VALUE", "RATE %", "PARTY GSTIN"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9.5 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C5A96" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      hRow.height = 24;

      let sumTaxValue = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumRoundOff = 0, sumTotal = 0;

      saleRows.forEach((r) => {
        sumTaxValue += r.taxValue;
        sumCgst += r.cgst;
        sumSgst += r.sgst;
        sumIgst += r.igst;
        sumRoundOff += r.roundOff;
        sumTotal += r.totalValue;

        const dRow = ws.addRow([
          formatIndianDate(r.date),
          r.partyName,
          r.qty ?? "",
          r.billNo,
          r.hsnCode,
          r.taxValue,
          r.cgst > 0 ? r.cgst : null,
          r.sgst > 0 ? r.sgst : null,
          r.igst > 0 ? r.igst : null,
          r.roundOff !== 0 ? r.roundOff : null,
          r.totalValue,
          r.rate > 0 ? r.rate : null,
          r.partyGstin || "",
        ]);

        dRow.eachCell((cell) => { cell.alignment = { vertical: "middle" }; });
        applyNumberCols(dRow, [6, 7, 8, 9, 10, 11]);
      });

      // Totals row: Coral Red
      const totRow = ws.addRow(["", "", "", "", "TOTAL", sumTaxValue, sumCgst, sumSgst, sumIgst, sumRoundOff, sumTotal, "", ""]);
      totRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBA4D47" } };
        cell.alignment = { horizontal: col >= 6 && col <= 11 ? "right" : "center", vertical: "middle" };
        if (col >= 6 && col <= 11 && typeof cell.value === "number") cell.numFmt = "#,##0.00";
      });
      totRow.height = 24;
    }

    // ── Helper to render Purchase Table onto a Worksheet ────────────────────
    async function renderPurchaseTable(ws: ExcelJS.Worksheet) {
      const rows = await db.select().from(purchases)
        .where(between(purchases.date, from, to))
        .orderBy(desc(purchases.date));

      // Title row: PURCHASE [PERIOD]
      const titleRow = ws.addRow([]);
      const titleRowIdx = titleRow.number;
      ws.mergeCells(`B${titleRowIdx}:E${titleRowIdx}`);
      const titleCell = ws.getCell(`B${titleRowIdx}`);
      titleCell.value = makeTitle("PURCHASE", "", from, to);
      titleCell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3EA7C1" } };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      titleRow.height = 28;

      // Header row
      const headers = ["DATE", "PARTY NAME", "", "BILL NO", "HSN CODE", "TAX VALUE", "CGST", "SGST", "IGST", "R OFF", "TOTAL VALUE", "RATE %", "PARTY GSTIN"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9.5 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C5A96" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      hRow.height = 24;

      let sumTaxValue = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumRoundOff = 0, sumTotal = 0;

      rows.forEach((r) => {
        const tv = fmt(r.taxValue), cgst = fmt(r.cgstAmount), sgst = fmt(r.sgstAmount), igst = fmt(r.igstAmount), ro = fmt(r.roundOff), tot = fmt(r.totalValue);
        sumTaxValue += tv; sumCgst += cgst; sumSgst += sgst; sumIgst += igst; sumRoundOff += ro; sumTotal += tot;
        const gstRate = fmt(r.cgstRate) + fmt(r.sgstRate) + fmt(r.igstRate);

        const dRow = ws.addRow([
          formatIndianDate(r.date),
          r.partyName,
          r.qty ? Number(r.qty) : "",
          r.billNo,
          r.hsnCode,
          tv,
          cgst > 0 ? cgst : null,
          sgst > 0 ? sgst : null,
          igst > 0 ? igst : null,
          ro !== 0 ? ro : null,
          tot,
          gstRate > 0 ? gstRate : null,
          r.partyGstin || "",
        ]);

        dRow.eachCell((cell) => { cell.alignment = { vertical: "middle" }; });
        applyNumberCols(dRow, [6, 7, 8, 9, 10, 11]);
      });

      // Totals row: Coral Red
      const totRow = ws.addRow(["", "", "", "", "TOTAL", sumTaxValue, sumCgst, sumSgst, sumIgst, sumRoundOff, sumTotal, "", ""]);
      totRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBA4D47" } };
        cell.alignment = { horizontal: col >= 6 && col <= 11 ? "right" : "center", vertical: "middle" };
        if (col >= 6 && col <= 11 && typeof cell.value === "number") cell.numFmt = "#,##0.00";
      });
      totRow.height = 24;
    }

    // ── Build Worksheet based on Type ───────────────────────────────────────
    let filename = "";

    if (type === "COMBINED") {
      // User request: "sales and purchase report in one tab keeping space of 10 rows in them"
      const ws = workbook.addWorksheet("SALE & PURCHASE");
      applySheetColumnWidths(ws);

      // 1. Render Sales (B2C includes all counter store bills + online orders)
      await renderSalesTable(ws, "B2C");

      // 2. Exactly 10 empty rows gap between Sales and Purchase
      for (let i = 0; i < 10; i++) {
        ws.addRow([]);
      }

      // 3. Render Purchase Table in the exact same tab
      await renderPurchaseTable(ws);

      filename = `SALE_AND_PURCHASE_${period}.xlsx`;

    } else if (type === "PURCHASE") {
      // Standalone Purchase tab
      const ws = workbook.addWorksheet("PURCHASE");
      applySheetColumnWidths(ws);
      await renderPurchaseTable(ws);
      filename = `PURCHASE_Report_${period}.xlsx`;

    } else {
      // Standalone B2C or B2B tab
      const variant = type === "B2B" ? "B2B" : "B2C";
      const ws = workbook.addWorksheet(`SALE ${variant}`);
      applySheetColumnWidths(ws);
      await renderSalesTable(ws, variant);
      filename = `${variant}_Sale_Report_${period}.xlsx`;
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