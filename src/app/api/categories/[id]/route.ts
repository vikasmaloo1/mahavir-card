import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categories } from "@/lib/db/schema";

export async function GET(_request: Request, ctx: RouteContext<"/api/categories/[id]">) {
  try {
    const { id } = await ctx.params;
    const [category] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return category ? jsonOk(category) : jsonError("Category not found", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
