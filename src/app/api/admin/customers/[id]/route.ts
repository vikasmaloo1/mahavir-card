import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addresses, bills, customers, inquiries, notificationLog, orderItems, orders, payments, quotes, savedJobs, walletTransactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const customerUpdateSchema = z.object({
  companyName: z.string().trim().min(2).max(160).optional(), contactName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(), gstNumber: z.string().trim().max(30).nullable().optional(),
  customerType: z.enum(["B2B", "B2C"]).optional(), city: z.string().trim().max(100).nullable().optional(),
  state: z.string().trim().max(100).nullable().optional(), stateCode: z.string().trim().max(3).toUpperCase().nullable().optional(),
  creditEnabled: z.union([z.boolean(), z.enum(["true", "false"]).transform((v) => v === "true")]).optional(),
  creditLimit: z.string().regex(/^-?\d+(\.\d{1,2})?$/).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(), status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET(request: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) return jsonError("Customer not found", 404);
    const [addressRows, orderRows, quoteRows, inquiryRows, walletRows, savedJobRows, notificationRows, billRows] = await Promise.all([
      db.select().from(addresses).where(eq(addresses.customerId, id)),
      db.select().from(orders).where(eq(orders.customerId, id)).orderBy(desc(orders.createdAt)),
      db.select().from(quotes).where(eq(quotes.customerId, id)),
      db.select().from(inquiries).where(eq(inquiries.customerId, id)),
      db.select().from(walletTransactions).where(eq(walletTransactions.customerId, id)).orderBy(desc(walletTransactions.createdAt)),
      db.select().from(savedJobs).where(eq(savedJobs.customerId, id)),
      db.select().from(notificationLog).where(eq(notificationLog.customerId, id)).orderBy(desc(notificationLog.createdAt)).limit(20),
      db.select().from(bills).where(eq(bills.customerId, id)).orderBy(desc(bills.invoiceDate)),
    ]);

    const orderIds = orderRows.map((o) => o.id);
    let orderItemsRows: (typeof orderItems.$inferSelect)[] = [];
    let paymentRows: (typeof payments.$inferSelect)[] = [];
    if (orderIds.length > 0) {
      [orderItemsRows, paymentRows] = await Promise.all([
        db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
        db.select().from(payments).where(inArray(payments.orderId, orderIds)),
      ]);
    }

    const ordersWithDetails = orderRows.map((order) => {
      const items = orderItemsRows.filter((item) => item.orderId === order.id);
      const payment = paymentRows.find((p) => p.orderId === order.id) || null;
      const jobNames = items
        .map((i) => i.jobName?.trim())
        .filter((name): name is string => Boolean(name && name.length > 0))
        .join(", ");
      return {
        ...order,
        items,
        payment,
        jobNames: jobNames || null,
      };
    });

    return jsonOk({
      customer,
      addresses: addressRows,
      orders: ordersWithDetails,
      quotes: quoteRows,
      inquiries: inquiryRows,
      walletTransactions: walletRows,
      savedJobs: savedJobRows,
      notifications: notificationRows,
      bills: billRows,
    });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/customers/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, customerUpdateSchema);
    const [existing] = await db.select({ customerType: customers.customerType }).from(customers).where(eq(customers.id, id)).limit(1);
    if (!existing) return jsonError("Customer not found", 404);

    let creditEnabled = input.creditEnabled;
    if (creditEnabled === undefined && input.customerType === "B2B" && existing.customerType !== "B2B") {
      creditEnabled = true;
    }

    const [customer] = await db.update(customers).set({
      ...input,
      ...(creditEnabled !== undefined ? { creditEnabled } : {}),
      updatedAt: new Date(),
    }).where(eq(customers.id, id)).returning();
    return customer ? jsonOk(customer) : jsonError("Customer not found", 404);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
