import { and, asc, eq, gt, isNull, lt, or } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { banners } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const placement = new URL(request.url).searchParams.get("placement")?.toUpperCase();
    const now = new Date();
    const rows = await db.select({
      id: banners.id,
      title: banners.title,
      subtitle: banners.subtitle,
      badge: banners.badge,
      ctaLabel: banners.ctaLabel,
      ctaUrl: banners.ctaUrl,
      imageUrl: banners.imageUrl,
      storageKey: banners.storageKey,
      placement: banners.placement,
      animationType: banners.animationType,
      sortOrder: banners.sortOrder,
    })
      .from(banners)
      .where(and(
        eq(banners.isActive, true),
        placement && placement !== "GLOBAL" ? or(eq(banners.placement, "GLOBAL"), eq(banners.placement, placement)) : eq(banners.isActive, true),
        or(isNull(banners.startsAt), lt(banners.startsAt, now)),
        or(isNull(banners.endsAt), gt(banners.endsAt, now)),
      ))
      .orderBy(asc(banners.sortOrder), asc(banners.createdAt));
    return jsonOk(rows);
  } catch (error) {
    return handleApiError(error);
  }
}
