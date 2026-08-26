import { asc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addons } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { addonSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    return jsonOk(await db.select().from(addons).orderBy(asc(addons.name)));
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, addonSchema);
    const [addon] = await db.insert(addons).values(input).returning();
    return addon ? jsonOk(addon, 201) : jsonError("Add-on was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
