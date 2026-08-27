import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { artworkRequirements, artworkSlots } from "@/lib/db/schema";

export async function resolveArtworkRequirement(productId: string, pricingRuleId?: string | null) {
  if (pricingRuleId) {
    const [specific] = await db.select().from(artworkRequirements).where(and(eq(artworkRequirements.productId, productId), eq(artworkRequirements.pricingRuleId, pricingRuleId), eq(artworkRequirements.isActive, true))).limit(1);
    if (specific) return specific;
  }
  const [productDefault] = await db.select().from(artworkRequirements).where(and(eq(artworkRequirements.productId, productId), eq(artworkRequirements.scopeKey, "PRODUCT"), eq(artworkRequirements.isActive, true))).limit(1);
  return productDefault ?? null;
}

export async function resolveArtworkRequirementWithSlots(productId: string, pricingRuleId?: string | null) {
  const requirement = await resolveArtworkRequirement(productId, pricingRuleId);
  if (!requirement) return null;
  const slots = await db.select().from(artworkSlots).where(and(eq(artworkSlots.artworkRequirementId, requirement.id), eq(artworkSlots.isActive, true)));
  return { ...requirement, slots: slots.sort((left, right) => left.sortOrder - right.sortOrder) };
}
