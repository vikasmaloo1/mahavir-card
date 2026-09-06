import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { pickReusableArtworkPerSlot } from "@/lib/artwork-reuse";
import { artworks } from "@/lib/db/schema";
import { db } from "@/lib/db/server";
import { requireUser } from "@/lib/permissions";

/**
 * Candidate artworks the caller has previously uploaded for this exact product +
 * pricing rule (configuration), one most-recent match per slot. This is a lookup
 * only — actually reusing a candidate still goes through validateRequiredArtwork
 * (src/lib/artwork-validation.ts) at checkout time, the single place compatibility
 * is enforced, so an incompatible pick is rejected there rather than here.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/products/[id]/artwork/reusable">) {
  try {
    const session = await requireUser(request);
    const { id: productId } = await ctx.params;
    const url = new URL(request.url);
    const pricingRuleId = url.searchParams.get("pricingRuleId");

    const rows = await db
      .select({ id: artworks.id, fileName: artworks.fileName, artworkSlotKey: artworks.artworkSlotKey, createdAt: artworks.createdAt })
      .from(artworks)
      .where(and(
        eq(artworks.uploadedBy, session.user.id),
        eq(artworks.productId, productId),
        eq(artworks.fileType, "cdr"),
        inArray(artworks.status, ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED"]),
        isNull(artworks.replacedAt),
        pricingRuleId ? eq(artworks.pricingRuleId, pricingRuleId) : isNull(artworks.pricingRuleId),
      ))
      .orderBy(desc(artworks.createdAt));

    return jsonOk({ candidates: pickReusableArtworkPerSlot(rows) });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
