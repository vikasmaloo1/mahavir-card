import { eq } from "drizzle-orm";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { purchases } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await params;
    const [row] = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
    if (!row) return jsonError("Purchase not found", 404);
    return jsonOk({ purchase: row });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const [existing] = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
    if (!existing) return jsonError("Purchase not found", 404);
    const partyName = String(body.partyName ?? existing.partyName).trim();
    const billNo = String(body.billNo ?? existing.billNo).trim();
    const items = body.items !== undefined ? (Array.isArray(body.items) ? body.items : []) : existing.items;
    const itemsTaxTotal = Array.isArray(items) && items.length > 0 ? items.reduce((sum: number, it: any) => sum + Number(it.amount ?? (Number(it.quantity || 0) * Number(it.rate || 0))), 0) : 0;
    const taxValue = Number(body.taxValue !== undefined && body.taxValue !== "" ? body.taxValue : (itemsTaxTotal > 0 ? itemsTaxTotal : existing.taxValue));
    const taxType = String(body.taxType ?? existing.taxType).toUpperCase();
    let cgstRate = 0, sgstRate = 0, igstRate = 0;
    if (taxType === "INTRA_STATE") { cgstRate = Number(body.cgstRate ?? existing.cgstRate); sgstRate = Number(body.sgstRate ?? existing.sgstRate); }
    else if (taxType === "INTER_STATE") { igstRate = Number(body.igstRate ?? existing.igstRate); }
    const cgstAmount = Number(((taxValue * cgstRate) / 100).toFixed(2));
    const sgstAmount = Number(((taxValue * sgstRate) / 100).toFixed(2));
    const igstAmount = Number(((taxValue * igstRate) / 100).toFixed(2));
    const rawTotal = taxValue + cgstAmount + sgstAmount + igstAmount;
    const roundOff = body.roundOff !== undefined && body.roundOff !== "" ? Number(Number(body.roundOff).toFixed(2)) : Number((Math.round(rawTotal) - rawTotal).toFixed(2));
    const totalValue = Number((rawTotal + roundOff).toFixed(2));

    const firstItem = Array.isArray(items) && items.length > 0 ? items[0] : null;
    const primaryHsn = body.hsnCode ? String(body.hsnCode).trim() : (firstItem?.hsnCode || existing.hsnCode);
    const primaryDesc = body.description !== undefined
      ? (body.description ? String(body.description).trim() : null)
      : (Array.isArray(items) && items.length > 0 ? items.map((it: any) => it.description?.trim()).filter(Boolean).join(", ") : existing.description);
    const totalQty = body.qty !== undefined
      ? (body.qty !== "" && body.qty !== null ? String(Number(body.qty).toFixed(3)) : null)
      : (Array.isArray(items) && items.length > 0 ? String(items.reduce((sum: number, it: any) => sum + Number(it.quantity || 0), 0).toFixed(3)) : existing.qty);
    const primaryUnit = body.qtyUnit ? String(body.qtyUnit).trim().toUpperCase() : (firstItem?.unit || existing.qtyUnit);

    const [updated] = await db.update(purchases).set({
      date: body.date ? new Date(body.date) : existing.date,
      partyName, billNo,
      partyGstin: body.partyGstin !== undefined ? (body.partyGstin ? String(body.partyGstin).trim().toUpperCase() : null) : existing.partyGstin,
      hsnCode: primaryHsn,
      description: primaryDesc,
      qty: totalQty,
      qtyUnit: primaryUnit,
      taxValue: taxValue.toFixed(2), taxType,
      cgstRate: cgstRate.toFixed(3), cgstAmount: cgstAmount.toFixed(2),
      sgstRate: sgstRate.toFixed(3), sgstAmount: sgstAmount.toFixed(2),
      igstRate: igstRate.toFixed(3), igstAmount: igstAmount.toFixed(2),
      roundOff: roundOff.toFixed(2), totalValue: totalValue.toFixed(2),
      items: items ?? [],
      notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : existing.notes,
      updatedAt: new Date(),
    }).where(eq(purchases.id, id)).returning();
    return jsonOk({ purchase: updated });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await params;
    const [existing] = await db.select({ id: purchases.id }).from(purchases).where(eq(purchases.id, id)).limit(1);
    if (!existing) return jsonError("Purchase not found", 404);
    await db.delete(purchases).where(eq(purchases.id, id));
    return jsonOk({ deleted: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}