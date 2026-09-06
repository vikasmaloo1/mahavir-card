import { desc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { customers, notificationLog } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireUser } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonOk({ items: [] });
    const items = await db
      .select({ id: notificationLog.id, event: notificationLog.event, subject: notificationLog.subject, body: notificationLog.body, status: notificationLog.status, createdAt: notificationLog.createdAt })
      .from(notificationLog)
      .where(eq(notificationLog.customerId, customer.id))
      .orderBy(desc(notificationLog.createdAt))
      .limit(50);
    return jsonOk({ items });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
