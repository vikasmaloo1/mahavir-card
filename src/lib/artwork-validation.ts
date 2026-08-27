import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { resolveArtworkRequirementWithSlots } from "@/lib/artwork-requirements";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";

export async function validateRequiredArtwork(userId: string, productId: string, configuration: Record<string, unknown>) {
  const pricingRuleId = typeof configuration.pricingRuleId === "string" ? configuration.pricingRuleId : null;
  const requirement = await resolveArtworkRequirementWithSlots(productId, pricingRuleId);
  if (!requirement?.artworkRequired) return;
  const submitted = configuration.artworkIds && typeof configuration.artworkIds === "object" && !Array.isArray(configuration.artworkIds)
    ? configuration.artworkIds as Record<string, unknown>
    : {};
  const legacyId = typeof configuration.artworkId === "string" ? configuration.artworkId : null;
  const requiredSlots = requirement.slots.filter((slot) => slot.required);
  const selected = requiredSlots.length
    ? requiredSlots.map((slot) => ({ slotKey: slot.slotKey, id: typeof submitted[slot.slotKey] === "string" ? String(submitted[slot.slotKey]) : null }))
    : [{ slotKey: "MAIN", id: legacyId ?? (typeof submitted.MAIN === "string" ? String(submitted.MAIN) : null) }];
  if (selected.some((entry) => !entry.id)) throw new Error("Upload every required CDR artwork file before continuing");
  const ids = selected.map((entry) => entry.id as string);
  const rows = await db.select({ id: artworks.id, slotKey: artworks.artworkSlotKey }).from(artworks).where(and(inArray(artworks.id, ids), eq(artworks.uploadedBy, userId), eq(artworks.productId, productId), eq(artworks.fileType, "cdr"), inArray(artworks.status, ["PENDING_REVIEW", "APPROVED", "CHANGES_REQUIRED"]), isNull(artworks.replacedAt), pricingRuleId ? eq(artworks.pricingRuleId, pricingRuleId) : isNull(artworks.pricingRuleId)));
  if (selected.some((entry) => !rows.some((row) => row.id === entry.id && row.slotKey === entry.slotKey))) throw new Error("The selected CDR artwork is not available for this configuration");
}
