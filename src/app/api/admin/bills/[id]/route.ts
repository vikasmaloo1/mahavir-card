import { eq, ilike } from "drizzle-orm";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, bills, businessSettings, customers } from "@/lib/db/schema";
import { parseChalanNumber } from "@/lib/bill-sequence-server";
import { formatDateIn } from "@/lib/invoice-helper";
import { parseInvoiceNumber } from "@/lib/invoice-sequence";
import { numberToIndianWords } from "@/lib/number-to-words";
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

    const [existing] = await db.select().from(bills).where(eq(bills.id, id)).limit(1);
    if (!existing) return jsonError("Bill not found", 404);

    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const updateData: Record<string, any> = { updatedAt: new Date() };

    // Quick status toggle or notes
    if (body.status && ["PAID", "UNPAID", "PARTIAL", "CANCELLED"].includes(body.status.toUpperCase())) {
      updateData.status = body.status.toUpperCase();
    }
    if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes).trim() : null;
    if (body.terms !== undefined) updateData.terms = body.terms ? String(body.terms).trim() : "Immediate";

    // If full bill edit (customer or items or invoice number passed)
    if (body.customerName !== undefined || Array.isArray(body.items) || body.invoiceNumber !== undefined) {
      const customerName = body.customerName !== undefined ? String(body.customerName).trim() : existing.customerName;
      if (!customerName) return jsonError("Customer name cannot be empty", 400);
      updateData.customerName = customerName;

      if (body.companyName !== undefined) updateData.companyName = body.companyName ? String(body.companyName).trim() : null;
      if (body.phone !== undefined) updateData.phone = body.phone ? String(body.phone).trim() : null;
      if (body.addressLine1 !== undefined) updateData.addressLine1 = body.addressLine1 ? String(body.addressLine1).trim() : null;
      if (body.addressLine2 !== undefined) updateData.addressLine2 = body.addressLine2 ? String(body.addressLine2).trim() : null;
      if (body.city !== undefined) updateData.city = body.city ? String(body.city).trim() : "Ahmedabad";
      if (body.state !== undefined) updateData.state = body.state ? String(body.state).trim() : "Gujarat";
      if (body.stateCode !== undefined) updateData.stateCode = body.stateCode ? String(body.stateCode).trim().toUpperCase() : "GJ";
      if (body.postalCode !== undefined) updateData.postalCode = body.postalCode ? String(body.postalCode).trim() : null;
      if (body.gstin !== undefined) updateData.gstin = body.gstin ? String(body.gstin).trim().toUpperCase() : null;

      // Customer auto-find or auto-save in system by default
      let customerId = body.customerId !== undefined ? (body.customerId ? String(body.customerId).trim() : null) : existing.customerId;
      if (!customerId && customerName) {
        try {
          let matchedCustomer = null;
          const phoneClean = body.phone ? String(body.phone).trim() : (existing.phone || "");
          if (phoneClean) {
            const [byPhone] = await db.select().from(customers).where(eq(customers.phone, phoneClean)).limit(1);
            matchedCustomer = byPhone || null;
          }
          if (!matchedCustomer && customerName) {
            const [byName] = await db.select().from(customers).where(ilike(customers.contactName, customerName)).limit(1);
            matchedCustomer = byName || null;
          }

          if (matchedCustomer) {
            customerId = matchedCustomer.id;
            const updateCust: Record<string, any> = {};
            if (!matchedCustomer.gstNumber && (body.gstin || existing.gstin)) {
              updateCust.gstNumber = String(body.gstin || existing.gstin).trim().toUpperCase();
            }
            if (!matchedCustomer.companyName && (body.companyName || existing.companyName)) {
              updateCust.companyName = String(body.companyName || existing.companyName).trim();
            }
            if (Object.keys(updateCust).length > 0) {
              await db.update(customers).set(updateCust).where(eq(customers.id, matchedCustomer.id));
            }
          } else {
            const [createdCustomer] = await db
              .insert(customers)
              .values({
                contactName: customerName,
                companyName: body.companyName ? String(body.companyName).trim() : customerName,
                email: `bill-customer-${Date.now()}@offline.local`,
                phone: phoneClean || null,
                gstNumber: body.gstin ? String(body.gstin).trim().toUpperCase() : null,
                customerType: body.gstin ? "B2B" : "B2C",
                city: body.city ? String(body.city).trim() : "Ahmedabad",
                state: body.state ? String(body.state).trim() : "Gujarat",
                stateCode: body.stateCode ? String(body.stateCode).trim().toUpperCase() : "GJ",
                status: "ACTIVE",
              })
              .returning();
            if (createdCustomer) {
              customerId = createdCustomer.id;
              if (body.addressLine1) {
                await db
                  .insert(addresses)
                  .values({
                    customerId: createdCustomer.id,
                    type: "BILLING",
                    line1: String(body.addressLine1).trim(),
                    line2: body.addressLine2 ? String(body.addressLine2).trim() : null,
                    city: body.city ? String(body.city).trim() : "Ahmedabad",
                    state: body.state ? String(body.state).trim() : "Gujarat",
                    stateCode: body.stateCode ? String(body.stateCode).trim().toUpperCase() : "GJ",
                    postalCode: body.postalCode ? String(body.postalCode).trim() : "380001",
                    isDefault: true,
                  })
                  .catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error("Failed to auto-save customer during bill update:", err);
        }
      }
      updateData.customerId = customerId;

      // Invoice & Chalan numbers and dates
      if (body.invoiceNumber !== undefined) {
        const invNo = String(body.invoiceNumber).trim();
        if (invNo) {
          updateData.invoiceNumber = invNo;
          const parsed = parseInvoiceNumber(invNo);
          if (parsed.year) updateData.invoiceYear = parsed.year;
          if (parsed.sequence) updateData.invoiceSequence = parsed.sequence;
        }
      }
      if (body.invoiceDate !== undefined) {
        updateData.invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : existing.invoiceDate;
      }
      if (body.chalanNumber !== undefined) {
        const chNo = String(body.chalanNumber).trim();
        updateData.chalanNumber = chNo || null;
        if (chNo) {
          const parsedCh = parseChalanNumber(chNo);
          if (parsedCh) updateData.chalanSequence = parsedCh;
        }
      }
      if (body.chalanDate !== undefined) {
        updateData.chalanDate = body.chalanDate ? new Date(body.chalanDate) : null;
      }

      // Line items & recalculate amounts
      const rawItems = Array.isArray(body.items) ? body.items : existing.items;
      const sanitizedItems = rawItems.map((it: any, idx: number) => {
        const qty = Math.max(1, Number(it.quantity || 1));
        const rate = Math.max(0, Number(it.rate || 0));
        const amount = Number((it.amount !== undefined ? Number(it.amount) : qty * rate).toFixed(2));
        return {
          id: it.id || `item-${idx + 1}`,
          description: String(it.description || "PRINTING WORK").trim().toUpperCase(),
          hsnCode: String(it.hsnCode || "4909").trim(),
          quantity: qty,
          rate: rate,
          per: String(it.per || "PCS.").trim().toUpperCase(),
          amount: amount,
          itemType: it.itemType ? String(it.itemType).trim() : undefined,
        };
      });

      // Validate GST rate uniformity: no mixing of 5% (advertisement) and 18% products in the same bill
      function getItemGstRate(hsnCode: string, desc: string): number {
        const code = (hsnCode || "").trim();
        const lower = (desc || "").toLowerCase();
        if (
          code === "4911" ||
          lower.includes("advertis") ||
          lower.includes("pamphlet") ||
          lower.includes("flyer") ||
          lower.includes("leaflet") ||
          lower.includes("handbill")
        ) {
          return 5;
        }
        return 18;
      }

      if (sanitizedItems.length > 1) {
        const firstRate = getItemGstRate(sanitizedItems[0].hsnCode, sanitizedItems[0].description);
        for (let i = 1; i < sanitizedItems.length; i++) {
          const itemRate = getItemGstRate(sanitizedItems[i].hsnCode, sanitizedItems[i].description);
          if (itemRate !== firstRate) {
            return jsonError(
              `Cannot mix ${firstRate}% and ${itemRate}% GST products in the same bill. All items in a single bill must have the same tax rate.`,
              400
            );
          }
        }
      }

      updateData.items = sanitizedItems;

      const subtotal = sanitizedItems.reduce((acc: number, it: any) => acc + it.amount, 0);
      updateData.subtotal = String(subtotal.toFixed(2));

      // Tax
      const taxType = String(body.taxType || existing.taxType || "INTRA_STATE").toUpperCase();
      updateData.taxType = taxType;

      let cgstRate = 0;
      let sgstRate = 0;
      let igstRate = 0;

      if (taxType === "INTRA_STATE") {
        cgstRate = Number(body.cgstRate !== undefined ? body.cgstRate : existing.cgstRate || 9);
        sgstRate = Number(body.sgstRate !== undefined ? body.sgstRate : existing.sgstRate || 9);
        igstRate = 0;
      } else if (taxType === "INTER_STATE") {
        cgstRate = 0;
        sgstRate = 0;
        igstRate = Number(body.igstRate !== undefined ? body.igstRate : existing.igstRate || 18);
      } else {
        cgstRate = 0;
        sgstRate = 0;
        igstRate = 0;
      }

      const cgstAmount = Number(((subtotal * cgstRate) / 100).toFixed(2));
      const sgstAmount = Number(((subtotal * sgstRate) / 100).toFixed(2));
      const igstAmount = Number(((subtotal * igstRate) / 100).toFixed(2));
      const totalTaxes = cgstAmount + sgstAmount + igstAmount;

      updateData.cgstRate = String(cgstRate.toFixed(3));
      updateData.cgstAmount = String(cgstAmount.toFixed(2));
      updateData.sgstRate = String(sgstRate.toFixed(3));
      updateData.sgstAmount = String(sgstAmount.toFixed(2));
      updateData.igstRate = String(igstRate.toFixed(3));
      updateData.igstAmount = String(igstAmount.toFixed(2));

      const deliveryCharge = Number(
        (body.deliveryCharge !== undefined ? Number(body.deliveryCharge) : Number(existing.deliveryCharge || 0)).toFixed(2)
      );
      updateData.deliveryCharge = String(deliveryCharge.toFixed(2));

      const rawTotal = subtotal + totalTaxes + deliveryCharge;
      const roundOff = body.roundOff !== undefined
        ? Number(Number(body.roundOff).toFixed(2))
        : Number((Math.round(rawTotal) - rawTotal).toFixed(2));
      updateData.roundOff = String(roundOff.toFixed(2));

      const grandTotal = Number((rawTotal + roundOff).toFixed(2));
      updateData.grandTotal = String(grandTotal.toFixed(2));
      updateData.amountInWords = numberToIndianWords(grandTotal);
    }

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
