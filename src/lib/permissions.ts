import "server-only";

import { and, eq } from "drizzle-orm";

import { auth } from "./auth/server";
import { db } from "@/lib/db/server";
import { admins } from "@/lib/db/schema";

export type Role = "ADMIN";

export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function requireUser(request: Request) {
  const session = await getSession(request);
  if (!session) throw new Response(JSON.stringify({ success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } }), { status: 401, headers: { "Content-Type": "application/json" } });
  return session;
}

export async function requireRole(request: Request, roles: Role[]) {
  if (!roles.includes("ADMIN")) throw new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } }), { status: 403, headers: { "Content-Type": "application/json" } });
  return requireAdmin(request).then((access) => access.session);
}

export async function requireAdmin(request: Request) {
  const session = await requireUser(request);
  const [admin] = await db.select().from(admins).where(and(eq(admins.userId, session.user.id), eq(admins.status, "ACTIVE"))).limit(1);
  if (!admin) throw new Response(JSON.stringify({ success: false, error: { code: "FORBIDDEN", message: "Admin access required" } }), { status: 403, headers: { "Content-Type": "application/json" } });
  return { session, admin };
}

export async function getAdminAccess(request: Request) {
  const session = await getSession(request);
  if (!session) return null;
  const [admin] = await db.select().from(admins).where(and(eq(admins.userId, session.user.id), eq(admins.status, "ACTIVE"))).limit(1);
  return admin ? { session, admin } : null;
}
