import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categories } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { categorySchema } from "@/lib/validation";

export async function GET() {
  try {
    const data = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
    return jsonOk(data);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, categorySchema);
    const [category] = await db.insert(categories).values(input).returning();
    return category ? jsonOk(category, 201) : jsonError("Category was not created", 500);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
