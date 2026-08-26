import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { admins, user as authUser } from "@/lib/db/schema";
import { isValidIndianPhoneNumber, normalizePhoneNumber } from "@/lib/phone";
import { requireAdmin } from "@/lib/permissions";
import { adminUpdateSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/admins/[id]">) {
  try { await requireAdmin(request); const { id } = await ctx.params; const [admin] = await db.select({ admin: admins, user: { id: authUser.id, name: authUser.name, email: authUser.email, phoneNumber: authUser.phoneNumber } }).from(admins).innerJoin(authUser, eq(admins.userId, authUser.id)).where(eq(admins.id, id)).limit(1); return admin ? jsonOk(admin) : jsonError("Admin not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/admins/[id]">) {
  try {
    await requireAdmin(request);
    const { id } = await ctx.params;
    const input = await readBody(request, adminUpdateSchema);
    if (input.phoneNumber && !isValidIndianPhoneNumber(input.phoneNumber)) return jsonError("Enter a valid Indian mobile number", 422);
    const [target] = await db.select({ userId: admins.userId }).from(admins).where(eq(admins.id, id)).limit(1);
    if (!target) return jsonError("Admin not found", 404);
    const [admin] = await db.update(admins).set({ status: input.status, updatedAt: new Date() }).where(eq(admins.id, id)).returning();
    await db.update(authUser).set({ ...(input.phoneNumber !== undefined ? { phoneNumber: input.phoneNumber ? normalizePhoneNumber(input.phoneNumber) : null, phoneNumberVerified: false } : {}), ...(input.status ? { role: input.status === "ACTIVE" ? "ADMIN" : "CUSTOMER" } : {}), updatedAt: new Date() }).where(eq(authUser.id, target.userId));
    return admin ? jsonOk(admin) : jsonError("Admin not found", 404);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/admins/[id]">) {
  try { await requireAdmin(request); const { id } = await ctx.params; const [admin] = await db.update(admins).set({ status: "INACTIVE", updatedAt: new Date() }).where(eq(admins.id, id)).returning(); if (admin) await db.update(authUser).set({ role: "CUSTOMER", updatedAt: new Date() }).where(eq(authUser.id, admin.userId)); return admin ? jsonOk(admin) : jsonError("Admin not found", 404); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
