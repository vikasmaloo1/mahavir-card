import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { artworkRequirements, artworkSlots, products } from "@/lib/db/schema";
import { formatDimensions } from "@/lib/formatting";

export type ArtworkGuideSpec = {
  formatLabel: string;
  fullDesign: string | null;
  safeArea: string | null;
  finalSize: string | null;
  slots: string[];
  products: Array<{ name: string; slug: string }>;
};

/**
 * Groups real artworkRequirements rows (for active, required-artwork products)
 * by their dimension+slot signature, so the guide shows each distinct spec once
 * with the products that use it — pulled straight from the same data that
 * drives the per-product artwork upload UI, not hand-typed per product.
 */
export async function getArtworkGuideSpecs(): Promise<ArtworkGuideSpec[]> {
  const rows = await db
    .select({ requirement: artworkRequirements, productName: products.name, productSlug: products.slug })
    .from(artworkRequirements)
    .innerJoin(products, eq(artworkRequirements.productId, products.id))
    .where(and(eq(artworkRequirements.artworkRequired, true), eq(products.isActive, true), eq(products.status, "ACTIVE")));

  const slotRows = await db.select().from(artworkSlots).where(eq(artworkSlots.isActive, true));

  const groups = new Map<string, ArtworkGuideSpec>();
  for (const row of rows) {
    const r = row.requirement;
    const slots = slotRows.filter((slot) => slot.artworkRequirementId === r.id).map((slot) => slot.name);
    const signature = JSON.stringify([r.designWidth, r.designHeight, r.safeAreaWidth, r.safeAreaHeight, r.finalWidth, r.finalHeight, r.designUnit, [...slots].sort()]);
    const existing = groups.get(signature);
    if (existing) {
      existing.products.push({ name: row.productName, slug: row.productSlug });
      continue;
    }
    groups.set(signature, {
      formatLabel: (r.acceptedFormats ?? ["CDR"]).join(", "),
      fullDesign: formatDimensions(r.designWidth, r.designHeight, r.designUnit || "mm"),
      safeArea: formatDimensions(r.safeAreaWidth, r.safeAreaHeight, r.designUnit || "mm"),
      finalSize: formatDimensions(r.finalWidth, r.finalHeight, r.designUnit || "mm"),
      slots,
      products: [{ name: row.productName, slug: row.productSlug }],
    });
  }
  return [...groups.values()];
}
