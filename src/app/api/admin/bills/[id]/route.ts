import { eq } from "drizzle-orm";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { bills, businessSettings } from "@/lib/db/schema";
import { formatDateIn } from "@/lib/invoice-helper";
import type { InvoiceData } from "@/lib/invoice-types";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;

    const [bill] = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (!bill) return jsonError("Bill not found", 404);

    const [settingsRows] = await db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1);
    const settings = settingsRows || null;

    const formattedInvoiceDate = formatDateIn(bill.invoiceDate);
    const formattedChalanDate = bill.chalanDate ? formatDateIn(bill.chalanDate) : formattedInvoiceDate;

    // Convert bill to InvoiceData for TaxInvoiceDocument
    const invoiceData: InvoiceData = {
      orderId: bill.id,
      orderNumber: bill.chalanNumber || bill.invoiceNumber,
      invoiceNumber: bill.invoiceNumber,
      invoiceYear: bill.invoiceYear,
      invoiceSequence: bill.invoiceSequence,
      invoiceDate: formattedInvoiceDate,
      challanNumber: bill.chalanNumber || undefined,
      challanDate: formattedChalanDate,
      orderDate: formattedInvoiceDate,
      terms: bill.terms || "Immediate",

      sellerGstin: settings?.gstNumber || "24AIUPJ2271L1ZV",
      customer: {
        name: bill.customerName,
        companyName: bill.companyName || undefined,
        addressLine1: bill.addressLine1 || undefined,
        addressLine2: bill.addressLine2 || undefined,
        city: bill.city || "Ahmedabad",
        state: bill.state || "Gujarat",
        postalCode: bill.postalCode || undefined,
        phone: bill.phone || undefined,
        gstin: bill.gstin || undefined,
        customerType: "B2C",
      },
      items: bill.items.map((it, idx) => ({
        id: it.id || `item-${idx + 1}`,
        description: it.description,
        hsnCode: it.hsnCode,
        quantity: it.quantity,
        rate: it.rate,
        per: it.per || "PCS.",
        amount: it.amount,
      })),

      taxType: bill.taxType as any,
      cgstRate: Number(bill.cgstRate || 0),
      cgstAmount: Number(bill.cgstAmount || 0),
      sgstRate: Number(bill.sgstRate || 0),
      sgstAmount: Number(bill.sgstAmount || 0),
      igstRate: Number(bill.igstRate || 0),
      igstAmount: Number(bill.igstAmount || 0),

      subtotal: Number(bill.subtotal || 0),
      deliveryCharge: Number(bill.deliveryCharge || 0),
      roundOff: Number(bill.roundOff || 0),
      grandTotal: Number(bill.grandTotal || 0),
      amountInWords: bill.amountInWords || "",

      bank: {
        bankName: settings?.b2cBankName || "BANK OF BARODA",
        accountNumber: settings?.b2cBankAccountNumber || "03280200003947",
        ifscCode: settings?.b2cBankIfsc || "BARB0GANAHM",
        beneficiaryName: settings?.b2cBankBeneficiary || "MAHAVIR CARD",
        upiId: settings?.b2cUpiId || "mahavircard2011-2@oksbi",
        qrImageUrl: settings?.b2cQrImageUrl || "/images/qr/b2c-qr.jpg",
      },
      sizeMode: "AUTO",
      resolvedPageSize: "A4",
    };

    return jsonOk({ bill, invoiceData });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const updateData: Record<string, any> = { updatedAt: new Date() };

    if (body.status && ["PAID", "UNPAID", "PARTIAL", "CANCELLED"].includes(body.status.toUpperCase())) {
      updateData.status = body.status.toUpperCase();
    }
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.terms !== undefined) updateData.terms = body.terms;

    const [updated] = await db
      .update(bills)
      .set(updateData)
      .where(eq(bills.id, id))
      .returning();

    if (!updated) return jsonError("Bill not found", 404);
    return jsonOk({ bill: updated, message: "Bill updated successfully" });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;

    const [deleted] = await db
      .delete(bills)
      .where(eq(bills.id, id))
      .returning();

    if (!deleted) return jsonError("Bill not found", 404);
    return jsonOk({ message: "Bill deleted successfully" });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
