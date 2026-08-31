import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { isCustomerProfileComplete } from "@/lib/customer-profile";
import { addresses, customers } from "@/lib/db/schema";
import { indiaStateName, isCommerceStateCode } from "@/lib/india-states";
import { requireUser } from "@/lib/permissions";
import { customerOnboardingSchema, customerProfileUpdateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    const [address] = customer
      ? await db.select().from(addresses).where(and(eq(addresses.customerId, customer.id), eq(addresses.type, "DELIVERY"), eq(addresses.isDefault, true))).limit(1)
      : [];
    return jsonOk({ user: { name: session.user.name, email: session.user.email, phoneNumber: session.user.phoneNumber }, customer: customer ?? null, address: address ?? null, profileComplete: isCustomerProfileComplete(customer) });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, customerOnboardingSchema);
    if (!isCommerceStateCode(input.stateCode) || indiaStateName(input.stateCode) !== input.state) {
      return jsonError("Select Gujarat or Rajasthan", 422);
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

export async function PATCH(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, customerProfileUpdateSchema);
    if (!isCommerceStateCode(input.stateCode) || indiaStateName(input.stateCode) !== input.state) return jsonError("Select Gujarat or Rajasthan", 422);
    const [existing] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!existing) return jsonError("Complete account signup before editing your profile", 404);
    if (existing.customerType === "B2B" && !input.companyName) return jsonError("Company name is required for B2B accounts", 422);

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx.update(customers).set({
        contactName: input.contactName,
        companyName: input.companyName || input.contactName,
        phone: input.phone,
        city: input.city,
        state: input.state,
        stateCode: input.stateCode,
        gstNumber: input.gstNumber || null,
        updatedAt: new Date(),
      }).where(eq(customers.id, existing.id)).returning();
      if (!customer) return null;
      if (input.address) {
        const addressValues = { line1: input.address.line1, line2: input.address.line2 || null, city: input.city, state: input.state, stateCode: input.stateCode, postalCode: input.address.postalCode, country: "India", updatedAt: new Date() };
        const [currentAddress] = await tx.select({ id: addresses.id }).from(addresses).where(and(eq(addresses.customerId, customer.id), eq(addresses.type, "DELIVERY"), eq(addresses.isDefault, true))).limit(1);
        if (currentAddress) await tx.update(addresses).set(addressValues).where(eq(addresses.id, currentAddress.id));
        else await tx.insert(addresses).values({ customerId: customer.id, type: "DELIVERY", ...addressValues, isDefault: true });
      }
      return customer;
    });
    return result ? jsonOk({ customer: result, profileComplete: isCustomerProfileComplete(result) }) : jsonError("Customer profile was not saved", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
