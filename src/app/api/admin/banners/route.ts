import { asc } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { banners } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { bannerSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const rows = await db.select().from(banners).orderBy(asc(banners.sortOrder), asc(banners.createdAt));
    return jsonOk(rows);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, bannerSchema);
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
      return jsonError("End date must be after the start date", 422);
    }
    const [banner] = await db.insert(banners).values({
      ...input,
      subtitle: input.subtitle || null,
      badge: input.badge || null,
      ctaLabel: input.ctaLabel || null,
      ctaUrl: input.ctaUrl || null,
      imageUrl: input.imageUrl || null,
      storageKey: input.storageKey || null,
      updatedBy: admin.user.id,
    }).returning();
    return banner ? jsonOk(banner, 201) : jsonError("Banner was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
