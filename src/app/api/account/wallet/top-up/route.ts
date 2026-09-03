import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, walletTransactions } from "@/lib/db/schema";
import { isCustomerProfileComplete } from "@/lib/customer-profile";
import { requireUser } from "@/lib/permissions";

const topUpSchema = z.object({ amount: z.number().min(500, "Minimum top-up amount is ₹500").max(1_000_000), utr: z.string().trim().min(4).max(64).nullable().optional() });

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonOk({ customer: null, profileComplete: false, transactions: [] });
    const transactions = await db.select().from(walletTransactions).where(eq(walletTransactions.customerId, customer.id)).orderBy(desc(walletTransactions.createdAt)).limit(50);
    return jsonOk({ customer: { customerType: customer.customerType, creditEnabled: customer.creditEnabled, creditLimit: customer.creditLimit, availableBalance: customer.availableCredit, paymentTermsDays: customer.paymentTermsDays }, profileComplete: isCustomerProfileComplete(customer), transactions });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, topUpSchema);
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer || !isCustomerProfileComplete(customer)) return jsonError("Complete your customer profile to activate balance and top-up", 422);
    const [transaction] = await db.insert(walletTransactions).values({ customerId: customer.id, transactionType: "TOP_UP", status: "PENDING", amount: input.amount.toFixed(2), reference: `TOPUP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, notes: input.utr ? `UPI reference: ${input.utr}` : null, createdBy: session.user.id }).returning();
    return transaction ? jsonOk(transaction, 201) : jsonError("Top-up request was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
