import { and, asc, eq, gt, isNull, lt, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { notices } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const placement = new URL(request.url).searchParams.get("placement")?.toUpperCase();
    const now = new Date();
    const rows = await db.select({ id: notices.id, title: notices.title, message: notices.message, tone: notices.tone, placement: notices.placement, linkLabel: notices.linkLabel, linkUrl: notices.linkUrl })
      .from(notices)
      .where(and(
        eq(notices.isActive, true),
        placement && placement !== "GLOBAL" ? or(eq(notices.placement, "GLOBAL"), eq(notices.placement, placement)) : eq(notices.placement, "GLOBAL"),
        or(isNull(notices.startsAt), lt(notices.startsAt, now)),
        or(isNull(notices.endsAt), gt(notices.endsAt, now)),
      ))
      .orderBy(asc(notices.sortOrder), asc(notices.createdAt));
    return jsonOk(rows);
  } catch (error) {
    return handleApiError(error);
  }
}
