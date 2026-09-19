import { and, between, desc, eq, inArray, isNotNull, or } from "drizzle-orm";
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

function makeTitle(type: string, from: Date, to: Date): string {
  const months = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];
  const isSameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  const periodStr = isSameMonth ? `${months[from.getMonth()]} ${from.getFullYear()}` : `${formatIndianDate(from)} TO ${formatIndianDate(to)}`;
  if (type === "PURCHASE") {
    return `PURCHASE ${periodStr}`;
  }
  return `SALE ${periodStr}(${type})`;
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

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);

    const type = (searchParams.get("type") || "B2C").toUpperCase(); // B2C | B2B | PURCHASE
    const period = searchParams.get("period") || "monthly";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const { from, to } = getDateRange(period, dateFrom, dateTo);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mahavir Card Admin";
    workbook.created = new Date();

    const titleText = makeTitle(type, from, to);

    if (type === "PURCHASE") {
      // ── PURCHASE SHEET ─────────────────────────────────────────────────────
      const rows = await db.select().from(purchases)
        .where(between(purchases.date, from, to))
        .orderBy(desc(purchases.date));

      const ws = workbook.addWorksheet("PURCHASE");
      ws.properties.defaultColWidth = 16;

      // Title row (Row 1) - Teal background matching user screenshot
      ws.mergeCells("B1:E1");
      const title = ws.getCell("B1");
      title.value = titleText;
      title.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3EA7C1" } };
      title.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 28;

      // Header row (Row 2) - Purple background matching user screenshot
      const headers = ["DATE", "PARTY NAME", "BILL NO", "HSN CODE", "TAX VALUE", "CGST", "SGST", "IGST", "R OFF", "TOTAL VALUE", "RATE %", "PARTY GSTIN"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9.5 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C5A96" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      ws.getRow(2).height = 24;

      let sumTaxValue = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumRoundOff = 0, sumTotal = 0;

      rows.forEach((r) => {
        const tv = fmt(r.taxValue), cgst = fmt(r.cgstAmount), sgst = fmt(r.sgstAmount), igst = fmt(r.igstAmount), ro = fmt(r.roundOff), tot = fmt(r.totalValue);
        sumTaxValue += tv; sumCgst += cgst; sumSgst += sgst; sumIgst += igst; sumRoundOff += ro; sumTotal += tot;
        const gstRate = fmt(r.cgstRate) + fmt(r.sgstRate) + fmt(r.igstRate);

        const dRow = ws.addRow([
          formatIndianDate(r.date),
          r.partyName,
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
        applyNumberCols(dRow, [5, 6, 7, 8, 9, 10]);
      });

      // Red totals row at bottom
      const totRow = ws.addRow(["", "", "", "TOTAL", sumTaxValue, sumCgst, sumSgst, sumIgst, sumRoundOff, sumTotal, "", ""]);
      totRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBA4D47" } };
        cell.alignment = { horizontal: col >= 5 && col <= 10 ? "right" : "center", vertical: "middle" };
        if (col >= 5 && col <= 10 && typeof cell.value === "number") cell.numFmt = "#,##0.00";
      });
      totRow.height = 24;

      ws.getColumn(1).width = 14; ws.getColumn(2).width = 32; ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 12; ws.getColumn(5).width = 14; ws.getColumn(6).width = 12;
      ws.getColumn(7).width = 12; ws.getColumn(8).width = 12; ws.getColumn(9).width = 10;
      ws.getColumn(10).width = 15; ws.getColumn(11).width = 10; ws.getColumn(12).width = 22;

    } else {
      // ── SALES SHEET (B2C or B2B) ─────────────────────────────────────────
      // Rule: "manually added store bills too show it in reports. store bills are b2c always"
      // Therefore, in B2C: include ALL manual store bills from `bills` table + online B2C orders
      // In B2B: include online B2B orders + store bills with registered corporate GSTIN
      
      const allBills = await db.select().from(bills)
        .where(between(bills.invoiceDate, from, to))
        .orderBy(desc(bills.invoiceDate));

      // Fetch online orders with invoices in date range
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

      // Fetch item counts for orders
      const orderIds = allOrders.map((o) => o.id);
      const orderItemsMap = new Map<string, { qty: number; hsnCode: string }>();
      if (orderIds.length > 0) {
        const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
        for (const it of items) {
          const prev = orderItemsMap.get(it.orderId) || { qty: 0, hsnCode: "4909" };
          prev.qty += Number(it.quantity || 0);
          orderItemsMap.set(it.orderId, prev);
        }
      }

      // Unified Sales Row Structure
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

      // 1. Process Manual Store Bills
      for (const b of allBills) {
        const hasGstin = Boolean(b.gstin && b.gstin.trim().length > 5);
        // If B2C: include ALL store bills ("store bills are b2c always")
        // If B2B: include store bills only if they have corporate GSTIN
        if (type === "B2C" || (type === "B2B" && hasGstin)) {
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

      // 2. Process Store Orders Invoices
      for (const o of allOrders) {
        const isB2B = o.customerType === "B2B" || Boolean(o.gstNumber && o.gstNumber.trim().length > 5);
        if ((type === "B2C" && !isB2B) || (type === "B2B" && isB2B)) {
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

      // Sort rows by date descending
      saleRows.sort((a, b) => b.date.getTime() - a.date.getTime());

      const sheetName = type === "B2B" ? "SALE B2B" : "SALE B2C";
      const ws = workbook.addWorksheet(sheetName);
      ws.properties.defaultColWidth = 16;

      // Row 1: Merged title cell with cyan/teal background: SALE JUNE 2026(B2C)
      ws.mergeCells("B1:G1");
      const title = ws.getCell("B1");
      title.value = titleText;
      title.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF3EA7C1" } };
      title.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 28;

      // Row 2: Header row with purple background matching user's Excel
      const headers = ["DATE", "PARTY NAME", "QTY.", "BILL NO", "HSN CODE", "TAX VALUE", "C.GST", "SGST", "IGST", "R OFF", "TOTAL VALUE", "RATE %", "PARTY GSTIN"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 9.5 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C5A96" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
      });
      ws.getRow(2).height = 24;

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

      // Row totals: Coral red background at bottom
      const totRow = ws.addRow(["", "", "", "", "TOTAL", sumTaxValue, sumCgst, sumSgst, sumIgst, sumRoundOff, sumTotal, "", ""]);
      totRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFBA4D47" } };
        cell.alignment = { horizontal: col >= 6 && col <= 11 ? "right" : "center", vertical: "middle" };
        if (col >= 6 && col <= 11 && typeof cell.value === "number") cell.numFmt = "#,##0.00";
      });
      totRow.height = 24;

      ws.getColumn(1).width = 14;  // DATE
      ws.getColumn(2).width = 36;  // PARTY NAME
      ws.getColumn(3).width = 10;  // QTY.
      ws.getColumn(4).width = 12;  // BILL NO
      ws.getColumn(5).width = 12;  // HSN CODE
      ws.getColumn(6).width = 14;  // TAX VALUE
      ws.getColumn(7).width = 12;  // C.GST
      ws.getColumn(8).width = 12;  // SGST
      ws.getColumn(9).width = 12;  // IGST
      ws.getColumn(10).width = 10; // R OFF
      ws.getColumn(11).width = 15; // TOTAL VALUE
      ws.getColumn(12).width = 10; // RATE %
      ws.getColumn(13).width = 22; // PARTY GSTIN
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const safeType = type;
    const safePeriod = period;
    const filename = `${safeType}_Sale_Report_${safePeriod}.xlsx`;

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