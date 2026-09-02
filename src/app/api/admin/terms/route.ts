import { asc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { terms } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { termSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const result = await db.select().from(terms).orderBy(asc(terms.sortOrder), asc(terms.createdAt));
    return jsonOk(result);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, termSchema);
    const [term] = await db.insert(terms).values({
      title: input.title,
      titleGu: input.titleGu || null,
      titleHi: input.titleHi || null,
      content: input.content,
      contentGu: input.contentGu || null,
      contentHi: input.contentHi || null,
      category: input.category || "GENERAL",
      isImportant: input.isImportant ?? false,
      sortOrder: input.sortOrder ?? 0,
      isActive: input.isActive ?? true,
      updatedBy: admin.user.id,
    }).returning();
    return term ? jsonOk(term, 201) : jsonError("Term was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
