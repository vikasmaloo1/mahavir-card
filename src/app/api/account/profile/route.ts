import { and, eq, ne } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { isCustomerProfileComplete } from "@/lib/customer-profile";
import { addresses, customers, user } from "@/lib/db/schema";
import { indiaStateName, isCommerceStateCode } from "@/lib/india-states";
import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { requireUser } from "@/lib/permissions";
import { customerOnboardingSchema, customerProfileUpdateSchema } from "@/lib/validation";

class PhoneConflictError extends Error {}

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

    const normalizedPhone = normalizePhoneNumber(input.phone);
    if (!isValidIndianPhoneNumber(normalizedPhone)) return jsonError("Enter a valid Indian mobile number", 422);

    const values = {
      userId: session.user.id,
      email: session.user.email,
      contactName: input.contactName,
      companyName: input.customerType === "B2B" ? input.companyName! : input.companyName || input.contactName,
      phone: normalizedPhone,
      gstNumber: input.gstNumber || null,
      customerType: input.customerType,
      city: input.city,
      state: input.state,
      stateCode: input.stateCode,
      updatedAt: new Date(),
    };

    // Save the mobile number (on the auth user record, used for phone sign-in) and the
    // customer profile in one transaction: previously these were two separate API calls
    // from the signup form, and a failure on the second left an orphaned auth user with
    // no usable customer profile.
    const customer = await db.transaction(async (tx) => {
      const [existingPhoneOwner] = await tx.select({ id: user.id }).from(user).where(and(eq(user.phoneNumber, normalizedPhone), ne(user.id, session.user.id))).limit(1);
      if (existingPhoneOwner) throw new PhoneConflictError("That mobile number is already registered");
      await tx.update(user).set({ phoneNumber: normalizedPhone, phoneNumberVerified: false, updatedAt: new Date() }).where(eq(user.id, session.user.id));

      const [existing] = await tx.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
      const [saved] = existing
        ? await tx.update(customers).set(values).where(eq(customers.id, existing.id)).returning()
        : await tx.insert(customers).values(values).returning();
      return saved ?? null;
    });

    return customer ? jsonOk(customer, 201) : jsonError("Customer profile was not saved", 500);
  } catch (error) {
    if (error instanceof PhoneConflictError) return jsonError(error.message, 409);
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
    const targetCustomerType = input.customerType ?? existing.customerType;
    if (targetCustomerType === "B2B" && !input.companyName?.trim()) return jsonError("Company name is required for B2B accounts", 422);

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx.update(customers).set({
        contactName: input.contactName,
        companyName: input.companyName?.trim() || input.contactName,
        phone: input.phone,
        customerType: targetCustomerType,
        city: input.city,
        state: input.state,
        stateCode: input.stateCode,
        gstNumber: input.gstNumber?.trim() || null,
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
