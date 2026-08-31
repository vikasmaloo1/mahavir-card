import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { banners } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { storage } from "@/lib/storage";
import { bannerSchema } from "@/lib/validation";

export async function GET(request: Request, ctx: RouteContext<"/api/admin/banners/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [banner] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
    return banner ? jsonOk(banner) : jsonError("Banner not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/banners/[id]">) {
  try {
    const admin = await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const input = await readBody(request, bannerSchema.partial());
    if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) {
      return jsonError("End date must be after the start date", 422);
    }
    const [banner] = await db.update(banners).set({
      ...input,
      subtitle: input.subtitle !== undefined ? (input.subtitle || null) : undefined,
      badge: input.badge !== undefined ? (input.badge || null) : undefined,
      ctaLabel: input.ctaLabel !== undefined ? (input.ctaLabel || null) : undefined,
      ctaUrl: input.ctaUrl !== undefined ? (input.ctaUrl || null) : undefined,
      imageUrl: input.imageUrl !== undefined ? (input.imageUrl || null) : undefined,
      storageKey: input.storageKey !== undefined ? (input.storageKey || null) : undefined,
      updatedBy: admin.user.id,
      updatedAt: new Date(),
    }).where(eq(banners.id, id)).returning();
    return banner ? jsonOk(banner) : jsonError("Banner not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/banners/[id]">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const [banner] = await db.delete(banners).where(eq(banners.id, id)).returning();
    if (!banner) return jsonError("Banner not found", 404);
    if (banner.storageKey) {
      await storage.deleteObject(banner.storageKey).catch((err) => console.error("R2 banner image cleanup error", err));
    }
    return jsonOk({ deleted: true, id: banner.id });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
