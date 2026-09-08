import { and, desc, eq, inArray } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks, customers, orderItems, orders, orderStatusEvents, payments, paymentTransactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { mapItemsWithArtworks } from "@/lib/order-artwork-mapping";

function makeOrderNumber() {
  return `MHC-O-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>;

    const customerId = String(body.customerId || "").trim();
    if (!customerId) return jsonError("Customer selection is required", 400);

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);

    if (!customer) return jsonError("Selected customer does not exist", 404);

    const rawItems = Array.isArray(body.items) ? (body.items as Array<Record<string, unknown>>) : [];
    if (!rawItems.length) return jsonError("At least one order line item is required", 400);

    const processedItems = rawItems.map((item, idx) => {
      const description = String(item.description || item.name || `Item ${idx + 1}`).trim();
      const jobName = item.jobName ? String(item.jobName).trim() : null;
      const quantity = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Math.max(0, Number(item.unitPrice || 0));
      const totalPrice = (quantity * unitPrice).toFixed(2);
      const configuration = (item.configuration && typeof item.configuration === "object" ? item.configuration : {}) as Record<string, unknown>;
      const productId = typeof item.productId === "string" && item.productId ? item.productId : null;

      return {
        productId,
        description,
        jobName,
        quantity,
        unitPrice: unitPrice.toFixed(2),
        totalPrice,
        configuration,
      };
    });

    const subtotalNumber = processedItems.reduce((sum, it) => sum + Number(it.totalPrice), 0);
    const subtotal = subtotalNumber.toFixed(2);

    const deliveryMethod = typeof body.deliveryMethod === "string" ? body.deliveryMethod : "PICKUP";
    const deliveryState = typeof body.deliveryState === "string" && body.deliveryState ? body.deliveryState.toUpperCase() : (customer.stateCode || "GJ");
    const deliveryPriceNumber = Math.max(0, Number(body.deliveryPrice || 0));
    const deliveryPrice = deliveryPriceNumber.toFixed(2);

    const isIntraState = deliveryState === "GJ";
    const taxType = isIntraState ? "INTRA_STATE" : "INTER_STATE";
    const taxRate = "18.000";
    const cgstRate = isIntraState ? "9.000" : "0.000";
    const sgstRate = isIntraState ? "9.000" : "0.000";
    const igstRate = isIntraState ? "0.000" : "18.000";

    const taxAmountNumber = Number((subtotalNumber * 0.18).toFixed(2));
    const tax = taxAmountNumber.toFixed(2);

    let cgstAmount = "0.00";
    let sgstAmount = "0.00";
    let igstAmount = "0.00";

    if (isIntraState) {
      const half = Number((taxAmountNumber / 2).toFixed(2));
      cgstAmount = half.toFixed(2);
      sgstAmount = (taxAmountNumber - half).toFixed(2);
    } else {
      igstAmount = tax;
    }

    const total = (subtotalNumber + taxAmountNumber + deliveryPriceNumber).toFixed(2);
    const orderNumber = makeOrderNumber();
    const orderStatus = typeof body.status === "string" && body.status ? body.status : "CONFIRMED";
    const notes = typeof body.notes === "string" && body.notes ? body.notes : "Order created by administrator for offline customer";

    const initialPayment = body.initialPayment && typeof body.initialPayment === "object" ? (body.initialPayment as Record<string, unknown>) : null;

    const result = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          customerId,
          status: orderStatus,
          subtotal,
          taxableSubtotal: subtotal,
          tax,
          taxType,
          taxRate,
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          taxJurisdictionState: "GJ",
          total,
          deliveryMethod,
          deliveryState,
          deliveryPrice,
          deliveryAddress: body.deliveryAddress ? (body.deliveryAddress as any) : null,
          notes,
        })
        .returning();

      await tx.insert(orderItems).values(
        processedItems.map((item) => ({
          orderId: order.id,
          productId: item.productId,
          description: item.description,
          jobName: item.jobName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxableAmount: item.totalPrice,
          totalPrice: item.totalPrice,
          configuration: item.configuration,
        }))
      );

      await tx.insert(orderStatusEvents).values({
        orderId: order.id,
        status: orderStatus,
        notes: `Order created by administrator for offline customer (${customer.contactName})`,
        changedBy: session.user.id,
      });

      const initialRecorded = Boolean(initialPayment?.recorded);
      const paidAmountNumber = initialRecorded ? Math.min(Number(total), Math.max(0, Number(initialPayment?.amount || 0))) : 0;
      const paidAmountStr = paidAmountNumber.toFixed(2);
      const isFull = paidAmountNumber >= Number(total) - 0.001;
      const paymentStatus = isFull ? "PAID" : paidAmountNumber > 0 ? "PARTIALLY_PAID" : "PENDING";
      const paymentMethod = initialPayment?.method ? String(initialPayment.method).toUpperCase() : "CASH";

      const [payment] = await tx
        .insert(payments)
        .values({
          orderId: order.id,
          customerId,
          method: paymentMethod,
          status: paymentStatus,
          amount: total,
          paidAmount: paidAmountStr,
          refundedAmount: "0.00",
        })
        .returning();

      if (initialRecorded && paidAmountNumber > 0) {
        const refStr = typeof initialPayment?.reference === "string" && initialPayment.reference ? initialPayment.reference.trim() : "None";
        const paymentNotes = typeof initialPayment?.notes === "string" ? initialPayment.notes.trim() : "";

        await tx.insert(paymentTransactions).values({
          paymentId: payment.id,
          transactionId: refStr !== "None" ? refStr : `OFFLINE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          status: "SUCCESS",
          amount: paidAmountStr,
          rawData: {
            recordedBy: session.user.id,
            method: paymentMethod,
            reference: refStr,
            notes: paymentNotes,
            recordedAt: new Date().toISOString(),
          },
        });

        const outstandingStr = (Math.max(0, Number(total) - paidAmountNumber)).toFixed(2);
        await tx.insert(orderStatusEvents).values({
          orderId: order.id,
          status: orderStatus,
          notes: `Initial payment received: ₹${paidAmountStr} via ${paymentMethod} (Ref: ${refStr}). Total paid: ₹${paidAmountStr} / ₹${total}. Outstanding: ₹${outstandingStr}.`,
          changedBy: session.user.id,
        });
      }

      return { order, payment };
    });

    return jsonOk(result, 201);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25)));
    const customerType = params.get("customerType");
    const conditions = customerType === "B2B" || customerType === "B2C" ? [eq(customers.customerType, customerType)] : [];
    const rows = await db
      .select({ order: orders, customerName: customers.contactName, customerType: customers.customerType })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const orderIds = rows.map((row) => row.order.id);
    const [artworkRows, orderItemRows] = orderIds.length
      ? await Promise.all([
          db
            .select({
              id: artworks.id,
              orderId: artworks.orderId,
              fileName: artworks.fileName,
              status: artworks.status,
              fileSize: artworks.fileSize,
              productId: artworks.productId,
            })
            .from(artworks)
            .where(inArray(artworks.orderId, orderIds)),
          db
            .select({
              id: orderItems.id,
              orderId: orderItems.orderId,
              productId: orderItems.productId,
              jobName: orderItems.jobName,
              description: orderItems.description,
              quantity: orderItems.quantity,
              unitPrice: orderItems.unitPrice,
              totalPrice: orderItems.totalPrice,
              configuration: orderItems.configuration,
            })
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds)),
        ])
      : [[], []];

    const artworksByOrder = new Map<string, Array<{ id: string; fileName: string; status: string; fileSize: number | null; productId: string | null }>>();
    for (const art of artworkRows) {
      if (!art.orderId) continue;
      if (!artworksByOrder.has(art.orderId)) artworksByOrder.set(art.orderId, []);
      artworksByOrder.get(art.orderId)!.push(art);
    }

    const itemsByOrder = new Map<string, typeof orderItemRows>();
    for (const item of orderItemRows) {
      if (!itemsByOrder.has(item.orderId)) itemsByOrder.set(item.orderId, []);
      itemsByOrder.get(item.orderId)!.push(item);
    }

    const data = rows.map((row) => {
      const orderArtworks = artworksByOrder.get(row.order.id) ?? [];
      const orderItemList = itemsByOrder.get(row.order.id) ?? [];
      const { mappedItems, unmappedArtworks } = mapItemsWithArtworks(orderItemList, orderArtworks);
      const jobNames = orderItemList.map((item) => item.jobName || item.description).filter(Boolean);

      return {
        ...row.order,
        customerName: row.customerName,
        customerType: row.customerType,
        artworkCount: orderArtworks.length,
        artworks: orderArtworks,
        items: mappedItems,
        unmappedArtworks,
        firstArtworkId: orderArtworks[0]?.id ?? null,
        jobName: jobNames.join(", ") || null,
        jobNames,
      };
    });
    return jsonOk({ items: data, page, limit });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
