import { desc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { leadSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    return jsonOk(await db.select().from(leads).orderBy(desc(leads.createdAt)));
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await readBody(request, leadSchema);
    const [lead] = await db.insert(leads).values({
      ...input,
    }).returning();
    return lead ? jsonOk(lead, 201) : jsonError("Lead was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
