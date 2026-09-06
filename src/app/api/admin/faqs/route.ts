import { asc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { faqs } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { faqSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const rows = await db.select().from(faqs).orderBy(asc(faqs.category), asc(faqs.sortOrder));
    return jsonOk(rows);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, faqSchema);
    const [faq] = await db.insert(faqs).values(input).returning();
    return faq ? jsonOk(faq, 201) : jsonError("FAQ was not created", 500);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
