import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { terms } from "@/lib/db/schema";

export async function GET() {
  try {
    const list = await db
      .select({
        id: terms.id,
        title: terms.title,
        titleGu: terms.titleGu,
        titleHi: terms.titleHi,
        content: terms.content,
        contentGu: terms.contentGu,
        contentHi: terms.contentHi,
        category: terms.category,
        isImportant: terms.isImportant,
        sortOrder: terms.sortOrder,
        createdAt: terms.createdAt,
      })
      .from(terms)
      .where(eq(terms.isActive, true))
      .orderBy(asc(terms.sortOrder), asc(terms.createdAt));

    return jsonOk(list);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
