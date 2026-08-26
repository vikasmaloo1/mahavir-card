import { desc, eq } from "drizzle-orm";

import { getAdminAccess, getSession } from "@/lib/permissions";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { quoteItems, quotes } from "@/lib/db/schema";
import { quoteSchema, type QuoteInput } from "@/lib/validation";
import { calculateProductPrice } from "@/lib/pricing-service";

function makeNumber(prefix: string) {
  return `${prefix}-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function calculateItems<T extends QuoteInput["items"][number]>(items: T[]) {
  return items.map((item) => ({
    ...item,
    totalPrice: (item.quantity * Number(item.unitPrice)).toFixed(2),
  }));
}

function getSelections(configuration: Record<string, unknown>) {
  const addonIds = Array.isArray(configuration.addonIds) ? configuration.addonIds.filter((value): value is string => typeof value === "string") : [];
  const deliveryValue = configuration.delivery;
  const deliveryRecord = deliveryValue && typeof deliveryValue === "object" ? deliveryValue as Record<string, unknown> : null;
  const delivery = deliveryRecord && typeof deliveryRecord.method === "string"
    ? { method: deliveryRecord.method as "PICKUP" | "LOCAL_DELIVERY" | "COURIER", stateCode: typeof deliveryRecord.stateCode === "string" ? deliveryRecord.stateCode : undefined }
    : undefined;  return { addonIds, delivery };
}

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) return jsonError("Authentication required", 401);

    const admin = await getAdminAccess(request);
    const data = admin
      ? await db.select().from(quotes).orderBy(desc(quotes.createdAt))
      : await db.select().from(quotes).where(eq(quotes.userId, session.user.id)).orderBy(desc(quotes.createdAt));

    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    const input = await readBody(request, quoteSchema);
    const calculatedItems = await Promise.all(input.items.map(async (item) => {
      if (!item.productId) return { ...item, pricingSnapshot: {} };
      const price = await calculateProductPrice(item.productId, item.quantity, item.configuration, getSelections(item.configuration));
      const unitPrice = price?.calculatedAmount ?? item.unitPrice;
      return { ...item, unitPrice, pricingSnapshot: price ?? {} };
    }));
    const items = calculateItems(calculatedItems);
    const subtotal = items.reduce((total, item) => total + Number(item.totalPrice), 0).toFixed(2);
    const quoteNumber = makeNumber("MHC-Q");

    const result = await db.transaction(async (tx) => {
      const [quote] = await tx.insert(quotes).values({
        quoteNumber,
        userId: session?.user.id,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        companyName: input.companyName,
        notes: input.notes,
        subtotal,
        total: subtotal,
      }).returning();

      if (!quote) return null;

      await tx.insert(quoteItems).values(items.map((item) => ({
        quoteId: quote.id,
        productId: item.productId,
        variantId: item.variantId,
        description: item.description,
        configuration: item.configuration,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        pricingSnapshot: item.pricingSnapshot,
      })));

      return quote;
    });

    return result ? jsonOk(result, 201) : jsonError("Quote was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
