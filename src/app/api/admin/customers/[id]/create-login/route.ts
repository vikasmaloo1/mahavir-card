import { eq } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, user as authUser } from "@/lib/db/schema";
import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { requireRole } from "@/lib/permissions";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await params;

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id))
      .limit(1);

    if (!customer) return jsonError("Customer not found", 404);

    if (customer.userId) {
      const [existingUser] = await db
        .select({ id: authUser.id, email: authUser.email })
        .from(authUser)
        .where(eq(authUser.id, customer.userId))
        .limit(1);

      if (existingUser) {
        return jsonError(
          `Customer already has an active login account (${existingUser.email}).`,
          400
        );
      }
    }

    const body = ((await request.json().catch(() => ({}))) || {}) as { email?: string; password?: string };
    const email = String(body.email || customer.email || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !email.includes("@") || email.endsWith("@offline.local")) {
      return jsonError("A valid email address is required for creating a login", 400);
    }

    if (!password || password.length < 8) {
      return jsonError("Password must be at least 8 characters", 400);
    }

    const [existingUserWithEmail] = await db
      .select({ id: authUser.id })
      .from(authUser)
      .where(eq(authUser.email, email))
      .limit(1);

    if (existingUserWithEmail) {
      return jsonError("A user account with this email already exists", 409);
    }

    const signupRes = await auth.api.signUpEmail({
      body: {
        name: customer.contactName,
        email,
        password,
      },
    });

    if (!signupRes?.user?.id) {
      return jsonError("Failed to create customer login account", 500);
    }

    const userId = signupRes.user.id;
    let normalizedPhone: string | null = null;
    if (customer.phone && isValidIndianPhoneNumber(customer.phone)) {
      normalizedPhone = normalizePhoneNumber(customer.phone);
    }

    await db
      .update(authUser)
      .set({
        role: "CUSTOMER",
        ...(normalizedPhone ? { phoneNumber: normalizedPhone, phoneNumberVerified: false } : {}),
      })
      .where(eq(authUser.id, userId));

    const [updatedCustomer] = await db
      .update(customers)
      .set({
        userId,
        email,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    return jsonOk({
      customer: updatedCustomer,
      loginEmail: email,
      message: "Customer login provisioned successfully.",
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}