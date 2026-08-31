import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { customers, walletTransactions } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const status = new URL(request.url).searchParams.get("status");
    const rows = await db.select({ transaction: walletTransactions, customer: { id: customers.id, contactName: customers.contactName, companyName: customers.companyName, email: customers.email, availableCredit: customers.availableCredit } })
      .from(walletTransactions)
      .innerJoin(customers, eq(walletTransactions.customerId, customers.id))
      .where(status ? eq(walletTransactions.status, status) : undefined)
      .orderBy(desc(walletTransactions.createdAt));
    return jsonOk({ items: rows });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
