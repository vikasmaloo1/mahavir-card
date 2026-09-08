import { eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, walletTransactions } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

const addBalanceSchema = z.object({
  action: z.literal("ADD"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMode: z.string().trim().min(1, "Payment mode is required"),
  reference: z.string().trim().optional(),
  notes: z.string().trim().min(3, "Notes are required (min 3 characters)"),
});

const adjustBalanceSchema = z.object({
  action: z.literal("ADJUST"),
  adjustmentType: z.enum(["CREDIT", "DEBIT"]),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  reason: z.string().trim().min(2, "Reason is required"),
  notes: z.string().trim().min(3, "Detailed notes are required (min 3 characters)"),
});

const balanceManageSchema = z.discriminatedUnion("action", [
  addBalanceSchema,
  adjustBalanceSchema,
]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const { id } = await params;
    const body = await readBody(request, balanceManageSchema);

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx
        .select()
        .from(customers)
        .where(eq(customers.id, id))
        .for("update")
        .limit(1);

      if (!customer) {
        return { error: "Customer not found", status: 404 };
      }

      const balanceBefore = Number(customer.availableCredit || 0);
      let delta = 0;
      let notes = "";
      let transactionType = "";

      if (body.action === "ADD") {
        delta = body.amount;
        notes = `[${body.paymentMode}] ${body.notes}${body.reference ? ` (Ref: ${body.reference})` : ""}`;
        transactionType = "ADMIN_CREDIT";
      } else {
        delta = body.adjustmentType === "CREDIT" ? body.amount : -body.amount;
        notes = `[${body.adjustmentType}] Reason: ${body.reason}. ${body.notes}`;
        transactionType = "ADMIN_ADJUSTMENT";
      }

      const balanceAfter = (balanceBefore + delta).toFixed(2);

      await tx
        .update(customers)
        .set({
          availableCredit: balanceAfter,
          walletBalance: balanceAfter,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));

      const [txRecord] = await tx
        .insert(walletTransactions)
        .values({
          customerId: customer.id,
          transactionType,
          status: "APPROVED",
          amount: body.amount.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter,
          reference: body.action === "ADD" ? body.reference || null : null,
          notes,
          createdBy: session.user.id,
        })
        .returning();

      return {
        success: true,
        customerId: customer.id,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter,
        walletTransaction: txRecord,
      };
    });

    if ("error" in result && result.error) {
      return jsonError(result.error, (result.status as 400 | 404) || 400);
    }

    return jsonOk(result);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
