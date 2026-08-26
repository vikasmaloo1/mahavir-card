import { desc, ilike, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); const params = new URL(request.url).searchParams; const page = Math.max(1, Number(params.get("page") ?? 1)); const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 25))); const query = params.get("q")?.trim(); const where = query ? or(ilike(customers.companyName, `%${query}%`), ilike(customers.contactName, `%${query}%`), ilike(customers.email, `%${query}%`)) : undefined; const data = await db.select().from(customers).where(where).orderBy(desc(customers.createdAt)).limit(limit).offset((page - 1) * limit); return jsonOk({ items: data, page, limit }); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
