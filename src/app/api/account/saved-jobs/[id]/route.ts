import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { customers, savedJobs } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireUser } from "@/lib/permissions";

export async function DELETE(request: Request, ctx: RouteContext<"/api/account/saved-jobs/[id]">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonError("Job not found", 404);
    const [deleted] = await db.delete(savedJobs).where(and(eq(savedJobs.id, id), eq(savedJobs.customerId, customer.id))).returning({ id: savedJobs.id });
    return deleted ? jsonOk({ id: deleted.id }) : jsonError("Job not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
