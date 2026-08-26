import { desc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { quoteItems, quotes } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { quoteSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); const params = new URL(request.url).searchParams; const page = Math.max(1, Number(params.get("page") ?? 1)); const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25))); const data = await db.select().from(quotes).orderBy(desc(quotes.createdAt)).limit(limit).offset((page - 1) * limit); return jsonOk({ items: data, page, limit }); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, quoteSchema);
    const items = input.items.map((item) => ({ ...item, totalPrice: (item.quantity * Number(item.unitPrice)).toFixed(2) }));
    const subtotal = items.reduce((total, item) => total + Number(item.totalPrice), 0).toFixed(2);
    const result = await db.transaction(async (tx) => {
      const [quote] = await tx.insert(quotes).values({
        quoteNumber: `MHC-Q-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        contactName: input.contactName,
        email: input.email,
        phone: input.phone,
        companyName: input.companyName,
        notes: input.notes,
        status: "QUOTE_CREATED",
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
      })));
      return quote;
    });
    return result ? jsonOk(result, 201) : jsonError("Quote was not created", 500);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
