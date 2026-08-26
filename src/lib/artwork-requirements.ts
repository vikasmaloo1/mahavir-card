import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { artworkRequirements } from "@/lib/db/schema";

export async function resolveArtworkRequirement(productId: string, pricingRuleId?: string | null) {
  if (pricingRuleId) {
    const [specific] = await db.select().from(artworkRequirements).where(and(eq(artworkRequirements.productId, productId), eq(artworkRequirements.pricingRuleId, pricingRuleId), eq(artworkRequirements.isActive, true))).limit(1);
    if (specific) return specific;
  }
  const [productDefault] = await db.select().from(artworkRequirements).where(and(eq(artworkRequirements.productId, productId), eq(artworkRequirements.scopeKey, "PRODUCT"), eq(artworkRequirements.isActive, true))).limit(1);
  return productDefault ?? null;
}
