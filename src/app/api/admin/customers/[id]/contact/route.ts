import { eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { isValidContactMethod, isValidLeadStatus } from "@/lib/customer-whatsapp";

const contactActionSchema = z.object({
  method: z.enum(["WHATSAPP", "CALL", "OTHER"]).default("WHATSAPP"),
  leadStatus: z.enum([
    "NEW LEAD",
    "CONTACTED",
    "TALKED ON CALL",
    "FOLLOW UP",
    "QUOTED",
    "CONVERTED",
    "LOST",
    "INACTIVE",
  ]).optional(),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, contactActionSchema);

    const [existing] = await db
      .select({ id: customers.id, status: customers.status, leadStatus: customers.leadStatus })
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!existing) return jsonError("Customer not found", 404);

    const updateData: Record<string, unknown> = {
      lastContactedAt: new Date(),
      lastContactMethod: input.method,
      updatedAt: new Date(),
    };

    if (input.leadStatus) {
      updateData.leadStatus = input.leadStatus;
      if (input.leadStatus === "INACTIVE") {
        updateData.status = "INACTIVE";
      } else if (existing.status === "INACTIVE") {
        updateData.status = "ACTIVE";
      }
    }

    const [customer] = await db
      .update(customers)
      .set(updateData)
      .where(eq(customers.id, id))
      .returning();

    return customer ? jsonOk(customer) : jsonError("Customer not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
