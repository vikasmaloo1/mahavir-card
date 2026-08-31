import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, customers, inquiries, orders, quotes, walletTransactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const customerUpdateSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(), contactName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(), gstNumber: z.string().trim().max(30).nullable().optional(),
  customerType: z.enum(["B2B", "B2C"]).optional(), city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(), stateCode: z.string().trim().max(3).toUpperCase().nullable().optional(),
  creditEnabled: z.boolean().optional(), creditLimit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  availableCredit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), walletBalance: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(), status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(request: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return jsonError("Customer not found", 404);
    const [addressRows, orderRows, quoteRows, inquiryRows, walletRows] = await Promise.all([
      db.select().from(addresses).where(eq(addresses.customerId, id)),
      db.select().from(orders).where(eq(orders.customerId, id)),
      db.select().from(quotes).where(eq(quotes.customerId, id)),
      db.select().from(inquiries).where(eq(inquiries.customerId, id)),
      db.select().from(walletTransactions).where(eq(walletTransactions.customerId, id)).orderBy(desc(walletTransactions.createdAt)),
    ]);
    return jsonOk({ customer, addresses: addressRows, orders: orderRows, quotes: quoteRows, inquiries: inquiryRows, walletTransactions: walletRows });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  try { await requireRole(request, ["ADMIN"]); const { id } = await ctx.params; const input = await readBody(request, customerUpdateSchema); const [customer] = await db.update(customers).set({ ...input, updatedAt: new Date() }).where(eq(customers.id, id)).returning(); return customer ? jsonOk(customer) : jsonError("Customer not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
