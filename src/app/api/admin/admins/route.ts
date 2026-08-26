import { asc, eq } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { admins, user as authUser } from "@/lib/db/schema";
import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { requireAdmin } from "@/lib/permissions";
import { adminCreateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const data = await db.select({ admin: admins, user: { id: authUser.id, name: authUser.name, email: authUser.email, phoneNumber: authUser.phoneNumber } }).from(admins).innerJoin(authUser, eq(admins.userId, authUser.id)).orderBy(asc(authUser.name));
    return jsonOk(data);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    const creator = await requireAdmin(request);
    const input = await readBody(request, adminCreateSchema);
    if (input.phoneNumber && !isValidIndianPhoneNumber(input.phoneNumber)) return jsonError("Enter a valid Indian mobile number", 422);
    const result = await auth.api.signUpEmail({ body: { name: input.name, email: input.email, password: input.password } });
    await db.update(authUser).set({ role: "ADMIN", ...(input.phoneNumber ? { phoneNumber: normalizePhoneNumber(input.phoneNumber), phoneNumberVerified: false } : {}) }).where(eq(authUser.id, result.user.id));
    const [admin] = await db.insert(admins).values({ userId: result.user.id, role: "ADMIN", createdBy: creator.session.user.id }).returning();
    return admin ? jsonOk(admin, 201) : jsonError("Admin was not created", 500);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
