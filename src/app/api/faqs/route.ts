import { asc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { faqs } from "@/lib/db/schema";

export async function GET() {
  try {
    const rows = await db.select().from(faqs).where(eq(faqs.isActive, true)).orderBy(asc(faqs.category), asc(faqs.sortOrder));
    return jsonOk(rows);
  } catch (error) {
    return handleApiError(error);
  }
}
