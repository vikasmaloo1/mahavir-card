import { desc, eq } from "drizzle-orm";

import { getOwnedCart } from "@/lib/cart-service";
import { validateRequiredArtwork } from "@/lib/artwork-validation";
import { db } from "@/lib/db/server";
import { cartItems, customers, quoteItems, quotes } from "@/lib/db/schema";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { getAdminAccess, requireUser } from "@/lib/permissions";
import { quoteSubmitSchema } from "@/lib/validation";

function makeNumber() {
  return `MHC-Q-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const admin = await getAdminAccess(request);
    const data = admin
      ? await db.select().from(quotes).orderBy(desc(quotes.createdAt))
      : await db.select().from(quotes).where(eq(quotes.userId, session.user.id)).orderBy(desc(quotes.createdAt));
    return jsonOk(data);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, quoteSubmitSchema);
    const basket = await getOwnedCart(session.user.id, "QUOTE");
    if (!basket.id || !basket.items.length) return jsonError("Your quote basket is empty", 422);
    if (basket.items.some((item) => !item.available || !item.product.quoteable)) return jsonError("One or more products must be updated before quotation", 422);
    for (const item of basket.items) {
      try {
        await validateRequiredArtwork(session.user.id, item.productId, item.configuration);
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Artwork validation failed", 422);
      }
    }

    const subtotal = basket.summary.priceBeforeTax;
    const tax = basket.summary.tax;
    const total = basket.summary.total;
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    const customerState = customer?.stateCode ?? "GJ";
    const taxType = customerState === "GJ" ? "INTRA_STATE" : "INTER_STATE";
    const cgstRate = customerState === "GJ" ? "9.000" : "0.000";
    const sgstRate = customerState === "GJ" ? "9.000" : "0.000";
    const igstRate = customerState === "RJ" ? "18.000" : "0.000";

    const result = await db.transaction(async (tx) => {
      const [quote] = await tx.insert(quotes).values({
        quoteNumber: makeNumber(),
        userId: session.user.id,
        customerId: customer?.id ?? null,
        contactName: input.contactName,
        email: session.user.email,
        phone: input.phone,
        companyName: input.companyName,
        notes: input.notes,
        subtotal,
        taxableSubtotal: subtotal,
        tax,
        taxType,
        taxRate: "18.000",
        cgstRate,
        cgstAmount: basket.summary.cgst,
        sgstRate,
        sgstAmount: basket.summary.sgst,
        igstRate,
        igstAmount: basket.summary.igst,
        taxJurisdictionState: customerState,
        total,
      }).returning();
      if (!quote) return null;

      await tx.insert(quoteItems).values(basket.items.map((item) => {
        const lineTotal = Number(item.calculatedAmount ?? 0);
        const snapshot = (item.pricingSnapshot ?? {}) as Record<string, unknown>;
        const itemTaxable = snapshot.priceBeforeTax ?? snapshot.taxableSubtotal ?? snapshot.productPrice ?? "0.00";
        const itemTax = snapshot.taxAmount ?? "0.00";
        const itemCgst = snapshot.cgstAmount ?? "0.00";
        const itemSgst = snapshot.sgstAmount ?? "0.00";
        const itemIgst = snapshot.igstAmount ?? "0.00";
        return {
          quoteId: quote.id,
          productId: item.productId,
          description: item.product.name,
          jobName: item.jobName,
          configuration: item.configuration,
          quantity: item.quantity,
          unitPrice: (lineTotal / item.quantity).toFixed(2),
          taxableAmount: String(itemTaxable),
          taxAmount: String(itemTax),
          cgstAmount: String(itemCgst),
          sgstAmount: String(itemSgst),
          igstAmount: String(itemIgst),
          totalPrice: lineTotal.toFixed(2),
          pricingSnapshot: { ...snapshot, product: { id: item.productId, name: item.product.name, slug: item.product.slug }, quantity: item.quantity, capturedAt: new Date().toISOString() },
        };
      }));

      await tx.delete(cartItems).where(eq(cartItems.cartId, basket.id!));
      return quote;
    });

    return result ? jsonOk(result, 201) : jsonError("Quote was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
