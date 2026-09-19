import { and, between, desc, gte, ilike, lte, or } from "drizzle-orm";
import ExcelJS from "exceljs";
import { handleApiError, jsonError } from "@/lib/api";
import { db } from "@/lib/db/server";
import { bills, purchases } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

function fmt(v: string | number | null | undefined): number {
  return Number(v ?? 0);
}

function dateLabel(from: Date, to: Date): string {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${months[from.getMonth()]} ${from.getFullYear()}`;
  }
  return `${from.toLocaleDateString("en-IN")} - ${to.toLocaleDateString("en-IN")}`;
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

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);

    const type = (searchParams.get("type") || "B2C").toUpperCase(); // B2C | B2B | PURCHASE
    const period = searchParams.get("period") || "monthly"; // daily | weekly | monthly | custom
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";

    const { from, to } = getDateRange(period, dateFrom, dateTo);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mahavir Card Admin";
    workbook.created = new Date();

    const label = dateLabel(from, to);

    if (type === "PURCHASE") {
      // ── PURCHASE SHEET ──────────────────────────────────────────────────────
      const rows = await db.select().from(purchases)
        .where(between(purchases.date, from, to))
        .orderBy(desc(purchases.date));

      const ws = workbook.addWorksheet("PURCHASE");
      ws.properties.defaultColWidth = 16;

      // Title
      ws.mergeCells("A1:L1");
      const title = ws.getCell("A1");
      title.value = `PURCHASE REGISTER — ${label}`;
      title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7B3F8D" } };
      title.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 30;

      ws.addRow([]); // blank spacer

      // Header
      const headers = ["DATE", "PARTY NAME", "BILL NO", "HSN CODE", "TAX VALUE", "CGST", "SGST", "IGST", "R OFF", "TOTAL VALUE", "RATE %", "PARTY GSTIN"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7B3F8D" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
      });
      ws.getRow(3).height = 22;

      let sumTaxValue = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumRoundOff = 0, sumTotal = 0;

      rows.forEach((r, i) => {
        const tv = fmt(r.taxValue), cgst = fmt(r.cgstAmount), sgst = fmt(r.sgstAmount), igst = fmt(r.igstAmount), ro = fmt(r.roundOff), tot = fmt(r.totalValue);
        sumTaxValue += tv; sumCgst += cgst; sumSgst += sgst; sumIgst += igst; sumRoundOff += ro; sumTotal += tot;
        const gstRate = fmt(r.cgstRate) + fmt(r.sgstRate) + fmt(r.igstRate);
        const dRow = ws.addRow([
          new Date(r.date).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }),
          r.partyName,
          r.billNo,
          r.hsnCode,
          tv, cgst, sgst, igst, ro, tot,
          gstRate,
          r.partyGstin || "",
        ]);
        const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF5F0FA";
        dRow.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; cell.alignment = { vertical: "middle" }; });
        [5, 6, 7, 8, 9, 10].forEach((col) => {
          const c = dRow.getCell(col);
          c.numFmt = "#,##0.00";
          c.alignment = { horizontal: "right", vertical: "middle" };
        });
      });

      // Totals row
      const totRow = ws.addRow(["", "", "", "TOTAL", sumTaxValue, sumCgst, sumSgst, sumIgst, sumRoundOff, sumTotal, "", ""]);
      totRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC0392B" } };
        cell.alignment = { horizontal: col >= 5 && col <= 10 ? "right" : "center", vertical: "middle" };
        if (col >= 5 && col <= 10) cell.numFmt = "#,##0.00";
      });

      // Column widths
      ws.getColumn(1).width = 14; ws.getColumn(2).width = 28; ws.getColumn(3).width = 10;
      ws.getColumn(4).width = 12; ws.getColumn(5).width = 13; ws.getColumn(6).width = 12;
      ws.getColumn(7).width = 12; ws.getColumn(8).width = 12; ws.getColumn(9).width = 10;
      ws.getColumn(10).width = 14; ws.getColumn(11).width = 10; ws.getColumn(12).width = 20;

    } else {
      // ── SALES (B2C / B2B) SHEET ──────────────────────────────────────────────
      // Derive B2B vs B2C: if bill has gstin → B2B, else → B2C
      const conditions: any[] = [between(bills.invoiceDate, from, to)];
      if (type === "B2B") {
        conditions.push(or(
          ilike(bills.gstin, "24%"),
          ilike(bills.gstin, "0%"),
          ilike(bills.gstin, "1%"),
          ilike(bills.gstin, "2%"),
          ilike(bills.gstin, "3%"),
        ) as any);
      }

      const allBills = await db.select().from(bills)
        .where(and(...conditions))
        .orderBy(desc(bills.invoiceDate));

      // Filter in JS: B2B = has gstin, B2C = no gstin
      const filtered = type === "B2B"
        ? allBills.filter((b) => b.gstin && b.gstin.trim().length > 5)
        : type === "B2C"
        ? allBills.filter((b) => !b.gstin || b.gstin.trim().length < 5)
        : allBills;

      const sheetName = type === "B2B" ? "SALE B2B" : "SALE B2C";
      const ws = workbook.addWorksheet(sheetName);
      ws.properties.defaultColWidth = 16;

      // Title
      ws.mergeCells("A1:M1");
      const title = ws.getCell("A1");
      title.value = `${sheetName} — ${label}`;
      title.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
      title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A6E8E" } };
      title.alignment = { horizontal: "center", vertical: "middle" };
      ws.getRow(1).height = 30;
      ws.addRow([]);

      // Header
      const headers = ["DATE", "PARTY NAME", "QTY", "BILL NO", "HSN CODE", "TAX VALUE", "CGST", "SGST", "IGST", "R OFF", "TOTAL VALUE", "RATE %", "PARTY GSTIN"];
      const hRow = ws.addRow(headers);
      hRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A6E8E" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
      });
      ws.getRow(3).height = 22;

      let sumTaxValue = 0, sumCgst = 0, sumSgst = 0, sumIgst = 0, sumRoundOff = 0, sumTotal = 0;

      filtered.forEach((b, i) => {
        const totalQty = Array.isArray(b.items) ? b.items.reduce((s: number, it: any) => s + Number(it.quantity || 0), 0) : 0;
        const tv = fmt(b.subtotal), cgst = fmt(b.cgstAmount), sgst = fmt(b.sgstAmount), igst = fmt(b.igstAmount), ro = fmt(b.roundOff), tot = fmt(b.grandTotal);
        sumTaxValue += tv; sumCgst += cgst; sumSgst += sgst; sumIgst += igst; sumRoundOff += ro; sumTotal += tot;
        const gstRate = fmt(b.cgstRate) + fmt(b.sgstRate) + fmt(b.igstRate);
        const hsnCode = Array.isArray(b.items) && b.items.length > 0 ? (b.items[0] as any).hsnCode || "4909" : "4909";
        const dRow = ws.addRow([
          new Date(b.invoiceDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }),
          b.companyName || b.customerName,
          totalQty || "",
          b.invoiceNumber,
          hsnCode,
          tv, cgst, sgst, igst, ro, tot,
          gstRate,
          b.gstin || "",
        ]);
        const bg = i % 2 === 0 ? "FFFFFFFF" : "FFF0F8FF";
        dRow.eachCell((cell) => { cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } }; cell.alignment = { vertical: "middle" }; });
        [6, 7, 8, 9, 10, 11].forEach((col) => {
          const c = dRow.getCell(col);
          c.numFmt = "#,##0.00";
          c.alignment = { horizontal: "right", vertical: "middle" };
        });
      });

      // Totals row
      const totRow = ws.addRow(["", "", "", "", "TOTAL", sumTaxValue, sumCgst, sumSgst, sumIgst, sumRoundOff, sumTotal, "", ""]);
      totRow.eachCell((cell, col) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC0392B" } };
        cell.alignment = { horizontal: col >= 6 && col <= 11 ? "right" : "center", vertical: "middle" };
        if (col >= 6 && col <= 11) cell.numFmt = "#,##0.00";
      });

      // Column widths
      ws.getColumn(1).width = 14; ws.getColumn(2).width = 30; ws.getColumn(3).width = 8;
      ws.getColumn(4).width = 14; ws.getColumn(5).width = 12; ws.getColumn(6).width = 13;
      ws.getColumn(7).width = 12; ws.getColumn(8).width = 12; ws.getColumn(9).width = 12;
      ws.getColumn(10).width = 10; ws.getColumn(11).width = 14; ws.getColumn(12).width = 10;
      ws.getColumn(13).width = 20;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${type}_${safeLabel}.xlsx`;

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