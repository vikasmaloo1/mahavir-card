import { eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { user } from "@/lib/db/schema";
import { getSession } from "@/lib/permissions";
import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";

const phoneSchema = z.object({ phoneNumber: z.string().trim().min(10).max(20) });

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) return jsonError("Authentication required", 401);
    const input = await readBody(request, phoneSchema);
    const phoneNumber = normalizePhoneNumber(input.phoneNumber);
    if (!isValidIndianPhoneNumber(phoneNumber)) return jsonError("Enter a valid Indian mobile number", 422);

    const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.phoneNumber, phoneNumber)).limit(1);
    if (existing && existing.id !== session.user.id) return jsonError("That mobile number is already registered", 409);

    const [updated] = await db.update(user).set({ phoneNumber, phoneNumberVerified: false, updatedAt: new Date() }).where(eq(user.id, session.user.id)).returning({ id: user.id, phoneNumber: user.phoneNumber });
    return updated ? jsonOk(updated) : jsonError("Account was not updated", 500);
  } catch (error) {
    return handleApiError(error);
  }
}
