import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, bills, customers } from "@/lib/db/schema";
import { getNextBillNumbers, parseChalanNumber } from "@/lib/bill-sequence-server";
import { getFinancialYear, parseInvoiceNumber } from "@/lib/invoice-sequence";
import { numberToIndianWords } from "@/lib/number-to-words";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("query")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query) {
      conditions.push(
        or(
          ilike(bills.invoiceNumber, `%${query}%`),
          ilike(bills.chalanNumber, `%${query}%`),
          ilike(bills.customerName, `%${query}%`),
          ilike(bills.companyName, `%${query}%`),
          ilike(bills.phone, `%${query}%`),
          ilike(bills.gstin, `%${query}%`)
        )
      );
    }

    if (status && ["PAID", "UNPAID", "PARTIAL", "CANCELLED"].includes(status)) {
      conditions.push(eq(bills.status, status));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [billsList, totalCountResult, nextNumbers] = await Promise.all([
      db
        .select()
        .from(bills)
        .where(whereClause)
        .orderBy(desc(bills.invoiceDate), desc(bills.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(bills)
        .where(whereClause),
      getNextBillNumbers(),
    ]);

    const total = totalCountResult[0]?.count ?? 0;

    return jsonOk({
      bills: billsList,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      nextNumbers,
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;

    const customerName = String(body.customerName ?? "").trim();
    if (!customerName) return jsonError("Customer name is required", 400);

    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return jsonError("At least one line item is required", 400);

    // Sanitize items
    const sanitizedItems = items.map((it: any, idx: number) => {
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

    const subtotal = sanitizedItems.reduce((acc, it) => acc + it.amount, 0);

    // Tax calculation
    const taxType = String(body.taxType || "INTRA_STATE").toUpperCase(); // INTRA_STATE, INTER_STATE, EXEMPT
    let cgstRate = 0;
    let sgstRate = 0;
    let igstRate = 0;

    if (taxType === "INTRA_STATE") {
      cgstRate = Number(body.cgstRate !== undefined ? body.cgstRate : 9);
      sgstRate = Number(body.sgstRate !== undefined ? body.sgstRate : 9);
      igstRate = 0;
    } else if (taxType === "INTER_STATE") {
      cgstRate = 0;
      sgstRate = 0;
      igstRate = Number(body.igstRate !== undefined ? body.igstRate : 18);
    } else {
      // EXEMPT
      cgstRate = 0;
      sgstRate = 0;
      igstRate = 0;
    }

    const cgstAmount = Number(((subtotal * cgstRate) / 100).toFixed(2));
    const sgstAmount = Number(((subtotal * sgstRate) / 100).toFixed(2));
    const igstAmount = Number(((subtotal * igstRate) / 100).toFixed(2));
    const totalTaxes = cgstAmount + sgstAmount + igstAmount;

    const deliveryCharge = Number(Number(body.deliveryCharge || 0).toFixed(2));
    const rawTotal = subtotal + totalTaxes + deliveryCharge;
    const roundOff = body.roundOff !== undefined
      ? Number(Number(body.roundOff).toFixed(2))
      : Number((Math.round(rawTotal) - rawTotal).toFixed(2));
    const grandTotal = Number((rawTotal + roundOff).toFixed(2));
    const amountInWords = numberToIndianWords(grandTotal);

    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();
    const chalanDate = body.chalanDate ? new Date(body.chalanDate) : invoiceDate;

    // Incremental numbering
    const nextSeqData = await getNextBillNumbers(invoiceDate);

    let invoiceNumber = String(body.invoiceNumber ?? "").trim();
    let invoiceYear = nextSeqData.invoiceYear;
    let invoiceSequence = nextSeqData.nextInvoiceSequence;

    if (invoiceNumber) {
      const parsed = parseInvoiceNumber(invoiceNumber);
      if (parsed.year) invoiceYear = parsed.year;
      if (parsed.sequence) invoiceSequence = parsed.sequence;
    } else {
      invoiceNumber = nextSeqData.nextInvoiceNumber;
    }

    let chalanNumber = String(body.chalanNumber ?? "").trim();
    let chalanSequence = nextSeqData.nextChalanSequence;

    if (chalanNumber) {
      const parsedChalan = parseChalanNumber(chalanNumber);
      if (parsedChalan) chalanSequence = parsedChalan;
    } else {
      chalanNumber = nextSeqData.nextChalanNumber;
    }

    let customerId = body.customerId ? String(body.customerId).trim() : null;

    // Automatically check or save new customer in system by default
    if (!customerId && customerName) {
      try {
        let matchedCustomer = null;
        const phoneClean = body.phone ? String(body.phone).trim() : "";
        if (phoneClean) {
          const [byPhone] = await db
            .select()
            .from(customers)
            .where(eq(customers.phone, phoneClean))
            .limit(1);
          matchedCustomer = byPhone || null;
        }

        if (!matchedCustomer && customerName) {
          const [byName] = await db
            .select()
            .from(customers)
            .where(ilike(customers.contactName, customerName))
            .limit(1);
          matchedCustomer = byName || null;
        }

        if (matchedCustomer) {
          customerId = matchedCustomer.id;
          const updateCust: Record<string, any> = {};
          if (!matchedCustomer.gstNumber && body.gstin) {
            updateCust.gstNumber = String(body.gstin).trim().toUpperCase();
          }
          if (!matchedCustomer.companyName && body.companyName) {
            updateCust.companyName = String(body.companyName).trim();
          }
          if (Object.keys(updateCust).length > 0) {
            await db.update(customers).set(updateCust).where(eq(customers.id, matchedCustomer.id));
          }
        } else {
          // Automatically save new customer in the system by default
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
        console.error("Failed to auto-save customer from bill:", err);
      }
    }

    const [newBill] = await db
      .insert(bills)
      .values({
        invoiceNumber,
        invoiceYear,
        invoiceSequence,
        invoiceDate,
        chalanNumber,
        chalanSequence,
        chalanDate,

        customerId,
        customerName,
        companyName: body.companyName ? String(body.companyName).trim() : null,
        phone: body.phone ? String(body.phone).trim() : null,
        addressLine1: body.addressLine1 ? String(body.addressLine1).trim() : null,
        addressLine2: body.addressLine2 ? String(body.addressLine2).trim() : null,
        city: body.city ? String(body.city).trim() : "Ahmedabad",
        state: body.state ? String(body.state).trim() : "Gujarat",
        stateCode: body.stateCode ? String(body.stateCode).trim().toUpperCase() : "GJ",
        postalCode: body.postalCode ? String(body.postalCode).trim() : null,
        gstin: body.gstin ? String(body.gstin).trim().toUpperCase() : null,

        items: sanitizedItems,
        taxType,
        cgstRate: String(cgstRate.toFixed(3)),
        cgstAmount: String(cgstAmount.toFixed(2)),
        sgstRate: String(sgstRate.toFixed(3)),
        sgstAmount: String(sgstAmount.toFixed(2)),
        igstRate: String(igstRate.toFixed(3)),
        igstAmount: String(igstAmount.toFixed(2)),

        subtotal: String(subtotal.toFixed(2)),
        deliveryCharge: String(deliveryCharge.toFixed(2)),
        roundOff: String(roundOff.toFixed(2)),
        grandTotal: String(grandTotal.toFixed(2)),
        amountInWords,

        terms: body.terms ? String(body.terms).trim() : "Immediate",
        notes: body.notes ? String(body.notes).trim() : null,
        status: body.status ? String(body.status).toUpperCase() : "PAID",
      })
      .returning();

    return jsonOk({ bill: newBill, message: "Bill created successfully" }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
