import { asc, desc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { designTemplates } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { designTemplateSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const rows = await db.select().from(designTemplates).orderBy(asc(designTemplates.sortOrder), desc(designTemplates.createdAt));
    return jsonOk(rows);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, designTemplateSchema);
    const [template] = await db.insert(designTemplates).values(input).returning();
    return template ? jsonOk(template, 201) : jsonError("Template was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
