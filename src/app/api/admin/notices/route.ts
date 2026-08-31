import { asc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { notices } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { noticeSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    return jsonOk(await db.select().from(notices).orderBy(asc(notices.sortOrder), asc(notices.createdAt)));
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, noticeSchema);
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) return jsonError("End date must be after the start date", 422);
    const [notice] = await db.insert(notices).values({ ...input, linkLabel: input.linkLabel || null, linkUrl: input.linkUrl || null, updatedBy: admin.user.id }).returning();
    return notice ? jsonOk(notice, 201) : jsonError("Notice was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
