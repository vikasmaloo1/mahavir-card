import { desc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { pricingRules } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminPricingSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); return jsonOk(await db.select().from(pricingRules).orderBy(desc(pricingRules.createdAt))); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try { await requireRole(request, ["ADMIN"]); const input = await readBody(request, adminPricingSchema); const [rule] = await db.insert(pricingRules).values(input).returning(); return rule ? jsonOk(rule, 201) : jsonError("Pricing rule was not created", 500); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
