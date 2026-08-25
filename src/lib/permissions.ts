import { auth } from "./auth";

export type Role = "CUSTOMER" | "ADMIN";

export async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export async function requireUser(request: Request) {
  const session = await getSession(request);
  if (!session) {
    throw new Response(JSON.stringify({ error: { message: "Authentication required" } }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session;
}

export async function requireRole(request: Request, roles: Role[]) {
  const session = await requireUser(request);
  const role = String(session.user.role ?? "CUSTOMER") as Role;

  if (!roles.includes(role)) {
    throw new Response(JSON.stringify({ error: { message: "Insufficient permissions" } }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return session;
}
