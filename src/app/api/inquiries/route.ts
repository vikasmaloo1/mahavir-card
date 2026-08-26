import { desc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { inquiries } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { inquirySchema } from "@/lib/validation";

export async function GET(request: Request) {
  try { await requireRole(request, ["ADMIN"]); return jsonOk(await db.select().from(inquiries).orderBy(desc(inquiries.createdAt))); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function POST(request: Request) {
  try { const input = await readBody(request, inquirySchema); const [inquiry] = await db.insert(inquiries).values(input).returning(); return inquiry ? jsonOk(inquiry, 201) : jsonError("Inquiry was not created", 500); } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
