import { and, between, desc, eq, gte, ilike, lte, or, sql } from "drizzle-orm";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { purchases } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query")?.trim() || "";
    const dateFrom = searchParams.get("dateFrom")?.trim() || "";
    const dateTo = searchParams.get("dateTo")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    if (query) {
      conditions.push(
        or(
          ilike(purchases.partyName, `%${query}%`),
          ilike(purchases.billNo, `%${query}%`),
          ilike(purchases.partyGstin, `%${query}%`),
          ilike(purchases.hsnCode, `%${query}%`)
        ) as any
      );
    }

    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(between(purchases.date, from, to) as any);
    } else if (dateFrom) {
      conditions.push(gte(purchases.date, new Date(dateFrom)) as any);
    } else if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(purchases.date, to) as any);
    }

    const whereClause = conditions.length > 0 ? and(...(conditions as any)) : undefined;

    const [rows, totalResult] = await Promise.all([
      db.select().from(purchases).where(whereClause).orderBy(desc(purchases.date), desc(purchases.createdAt)).limit(limit).offset(offset),
      db.select({ count: sql<number>`count(*)::int` }).from(purchases).where(whereClause),
    ]);

    return jsonOk({ purchases: rows, pagination: { total: totalResult[0]?.count ?? 0, page, limit, totalPages: Math.ceil((totalResult[0]?.count ?? 0) / limit) } });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    const partyName = String(body.partyName ?? "").trim();
    if (!partyName) return jsonError("Party name is required", 400);
    const billNo = String(body.billNo ?? "").trim();
    if (!billNo) return jsonError("Bill number is required", 400);
    const items = Array.isArray(body.items) ? body.items : [];
    const itemsTaxTotal = items.reduce((sum: number, it: any) => sum + Number(it.amount ?? (Number(it.quantity || 0) * Number(it.rate || 0))), 0);
    const taxValue = Number(body.taxValue !== undefined && body.taxValue !== "" ? body.taxValue : itemsTaxTotal);
    if (isNaN(taxValue) || taxValue < 0) return jsonError("Tax value must be a non-negative number", 400);

    const taxType = String(body.taxType ?? "INTRA_STATE").toUpperCase();
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    if (taxType === "INTRA_STATE") { cgstRate = Number(body.cgstRate ?? 9); sgstRate = Number(body.sgstRate ?? cgstRate); igstRate = 0; }
    else if (taxType === "INTER_STATE") { igstRate = Number(body.igstRate ?? 18); cgstRate = 0; sgstRate = 0; }

    const cgstAmount = Number(((taxValue * cgstRate) / 100).toFixed(2));
    const sgstAmount = Number(((taxValue * sgstRate) / 100).toFixed(2));
    const igstAmount = Number(((taxValue * igstRate) / 100).toFixed(2));
    const rawTotal = taxValue + cgstAmount + sgstAmount + igstAmount;
    const roundOff = body.roundOff !== undefined && body.roundOff !== "" ? Number(Number(body.roundOff).toFixed(2)) : Number((Math.round(rawTotal) - rawTotal).toFixed(2));
    const totalValue = Number((rawTotal + roundOff).toFixed(2));

    const firstItem = items[0] || {};
    const primaryHsn = String(body.hsnCode || firstItem.hsnCode || "4802").trim();
    const primaryDesc = body.description
      ? String(body.description).trim()
      : items.length > 0
      ? items.map((it: any) => it.description?.trim()).filter(Boolean).join(", ")
      : null;
    const totalQty = body.qty !== undefined && body.qty !== ""
      ? String(Number(body.qty).toFixed(3))
      : items.length > 0
      ? String(items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0).toFixed(3))
      : null;
    const primaryUnit = body.qtyUnit ? String(body.qtyUnit).trim().toUpperCase() : (firstItem.unit || "PCS");

    const [created] = await db.insert(purchases).values({
      date: body.date ? new Date(body.date) : new Date(),
      partyName,
      partyGstin: body.partyGstin ? String(body.partyGstin).trim().toUpperCase() : null,
      billNo,
      hsnCode: primaryHsn,
      description: primaryDesc,
      qty: totalQty,
      qtyUnit: primaryUnit,
      taxValue: taxValue.toFixed(2),
      taxType,
      cgstRate: cgstRate.toFixed(3),
      cgstAmount: cgstAmount.toFixed(2),
      sgstRate: sgstRate.toFixed(3),
      sgstAmount: sgstAmount.toFixed(2),
      igstRate: igstRate.toFixed(3),
      igstAmount: igstAmount.toFixed(2),
      roundOff: roundOff.toFixed(2),
      totalValue: totalValue.toFixed(2),
      items,
      notes: body.notes ? String(body.notes).trim() : null,
      createdBy: session.user.id,
    }).returning();

    return jsonOk({ purchase: created }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
