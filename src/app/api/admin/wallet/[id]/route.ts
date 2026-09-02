import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { customers, walletTransactions } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireRole } from "@/lib/permissions";

const decisionSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), notes: z.string().trim().max(1000).nullable().optional() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/wallet/[id]">) {
  try {
    const admin = await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, decisionSchema);
    const result = await db.transaction(async (tx) => {
      const [existing] = await tx.select({ notes: walletTransactions.notes }).from(walletTransactions).where(and(eq(walletTransactions.id, id), eq(walletTransactions.transactionType, "TOP_UP"), eq(walletTransactions.status, "PENDING"))).limit(1);
      // Append the admin's decision note rather than overwrite: the customer's submitted
      // UPI reference (if any) lives in this same field and must not be discarded here.
      const combinedNotes = [existing?.notes, input.notes].filter(Boolean).join(" | ") || null;
      const [transaction] = await tx.update(walletTransactions).set({ status: input.decision, notes: combinedNotes, updatedAt: new Date() }).where(and(eq(walletTransactions.id, id), eq(walletTransactions.transactionType, "TOP_UP"), eq(walletTransactions.status, "PENDING"))).returning();
      if (!transaction) return null;
      if (input.decision === "REJECTED") return transaction;
      const [customer] = await tx.update(customers).set({
        availableCredit: sql`${customers.availableCredit} + ${transaction.amount}`,
        walletBalance: sql`${customers.availableCredit} + ${transaction.amount}`,
        updatedAt: new Date(),
      }).where(eq(customers.id, transaction.customerId)).returning({ availableCredit: customers.availableCredit });
      if (!customer) throw new Error("Customer account was not found");
      const [completed] = await tx.update(walletTransactions).set({ balanceAfter: customer.availableCredit, createdBy: admin.user.id, updatedAt: new Date() }).where(eq(walletTransactions.id, transaction.id)).returning();
      return completed;
    });
    return result ? jsonOk(result) : jsonError("This top-up request was already reviewed or does not exist", 409);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
