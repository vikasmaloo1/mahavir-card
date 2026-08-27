import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { resolveArtworkRequirement } from "@/lib/artwork-requirements";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";

export async function validateRequiredArtwork(userId: string, productId: string, configuration: Record<string, unknown>) {
  const pricingRuleId = typeof configuration.pricingRuleId === "string" ? configuration.pricingRuleId : null;
  const requirement = await resolveArtworkRequirement(productId, pricingRuleId);
  if (!requirement?.artworkRequired) return;
  const artworkId = typeof configuration.artworkId === "string" ? configuration.artworkId : null;
  if (!artworkId) throw new Error("Upload the required CDR artwork before continuing");
  const [artwork] = await db.select({ id: artworks.id }).from(artworks).where(and(eq(artworks.id, artworkId), eq(artworks.uploadedBy, userId), eq(artworks.productId, productId), eq(artworks.fileType, "cdr"), inArray(artworks.status, ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED"]), isNull(artworks.replacedAt), pricingRuleId ? eq(artworks.pricingRuleId, pricingRuleId) : isNull(artworks.pricingRuleId))).limit(1);
  if (!artwork) throw new Error("The selected CDR artwork is not available for this configuration");
}
