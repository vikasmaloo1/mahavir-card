import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { businessSettings, customers, orderItems, orders } from "@/lib/db/schema";
import { buildInvoiceData } from "@/lib/invoice-helper";
import { getOrAllocateInvoiceNumber } from "@/lib/invoice-sequence-server";
import { generateInvoiceDocument } from "@/lib/pdf-documents";
import { publicDocument } from "@/lib/document-storage";
import { requireRole } from "@/lib/permissions";
import { StorageConfigurationError } from "@/lib/storage";

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    const [customerRows, items, settingsRows] = await Promise.all([
      order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1) : Promise.resolve([]),
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1),
    ]);

    const customer = customerRows[0] || null;
    const settings = settingsRows[0] || null;

    if (customer && customer.customerType !== "B2C") {
      return jsonError("Tax invoice is only available for B2C orders", 400);
    }

    const allocation = await getOrAllocateInvoiceNumber(order.id);
    const invoiceData = buildInvoiceData(
      {
        ...order,
        invoiceNumber: allocation.invoiceNumber,
        invoiceYear: allocation.invoiceYear,
        invoiceSequence: allocation.invoiceSequence,
        invoiceDate: allocation.invoiceDate,
      },
      customer,
      items,
      settings
    );
    return jsonOk(invoiceData);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;

    const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!order) return jsonError("Order not found", 404);

    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, any>;
    const overrides = body.overrides || (body.invoiceNumber ? body : undefined);

    const [customerRows, items, settingsRows] = await Promise.all([
      order.customerId ? db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1) : Promise.resolve([]),
      db.select().from(orderItems).where(eq(orderItems.orderId, id)),
      db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1),
    ]);

    const customer = customerRows[0] || null;
    const settings = settingsRows[0] || null;

    if (customer && customer.customerType !== "B2C") {
      return jsonError("Tax invoice is only available for B2C orders", 400);
    }

    const allocation = await getOrAllocateInvoiceNumber(order.id, {
      customNumber: overrides?.invoiceNumber,
      customDate: overrides?.invoiceDate,
    });

    const invoiceData = buildInvoiceData(
      {
        ...order,
        invoiceNumber: allocation.invoiceNumber,
        invoiceYear: allocation.invoiceYear,
        invoiceSequence: allocation.invoiceSequence,
        invoiceDate: allocation.invoiceDate,
      },
      customer,
      items,
      settings,
      { ...overrides, invoiceNumber: allocation.invoiceNumber }
    );

    let doc = null;
    try {
      const generatedDoc = await generateInvoiceDocument(id, session.user.id);
      doc = publicDocument(generatedDoc);
    } catch (docErr) {
      console.warn("Storage upload deferred or unavailable for invoice document:", docErr);
    }

    return jsonOk({ invoice: invoiceData, document: doc }, 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) {
      return Response.json(
        { success: false, error: { code: "STORAGE_UNAVAILABLE", message: error.message } },
        { status: 503 }
      );
    }
    return handleApiError(error);
  }
}