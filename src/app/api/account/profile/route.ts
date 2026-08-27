import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers } from "@/lib/db/schema";
import { indiaStateName, isIndiaStateCode } from "@/lib/india-states";
import { requireUser } from "@/lib/permissions";
import { customerOnboardingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, customerOnboardingSchema);
    if (!isIndiaStateCode(input.stateCode) || indiaStateName(input.stateCode) !== input.state) {
      return jsonError("Select a valid Indian state", 422);
    }
    if (input.customerType === "B2B" && !input.companyName) return jsonError("Company name is required for B2B accounts", 422);
    const values = {
      userId: session.user.id,
      email: session.user.email,
      contactName: input.contactName,
      companyName: input.customerType === "B2B" ? input.companyName! : input.companyName || input.contactName,
      phone: input.phone,
      gstNumber: input.gstNumber || null,
      customerType: input.customerType,
      city: input.city,
      state: input.state,
      stateCode: input.stateCode,
      updatedAt: new Date(),
    };
    const [existing] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    const [customer] = existing
      ? await db.update(customers).set(values).where(eq(customers.id, existing.id)).returning()
      : await db.insert(customers).values(values).returning();
    return customer ? jsonOk(customer, existing ? 200 : 201) : jsonError("Customer profile was not saved", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
