import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addons, productAddons, productContentItems, productContentSections, productDeliveryRules, productImages, products, productVariants } from "@/lib/db/schema";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, ctx: RouteContext<"/api/products/[id]">) {
  try {
    const { id } = await ctx.params;
    const [product] = await db.select().from(products).where(and(uuidPattern.test(id) ? eq(products.id, id) : eq(products.slug, id), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
    if (!product) return jsonError("Product not found", 404);
    const [variants, images, sections, contentItems, productAddonRows, deliveryRules] = await Promise.all([
      db.select().from(productVariants).where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true))),
      db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder)),
      db.select().from(productContentSections).where(eq(productContentSections.productId, product.id)).orderBy(asc(productContentSections.sortOrder)),
      db.select().from(productContentItems).orderBy(asc(productContentItems.sortOrder)),
      db.select({ id: productAddons.id, addonId: productAddons.addonId, name: addons.name, description: addons.description, pricingType: addons.pricingType, price: productAddons.price, isDefault: productAddons.isDefault, sortOrder: productAddons.sortOrder, taxInclusive: productAddons.taxInclusive }).from(productAddons).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.productId, product.id), eq(productAddons.isActive, true), eq(addons.isActive, true))).orderBy(asc(productAddons.sortOrder)),
      db.select({ id: productDeliveryRules.id, deliveryMethod: productDeliveryRules.deliveryMethod, stateCode: productDeliveryRules.stateCode, price: productDeliveryRules.price, sortOrder: productDeliveryRules.sortOrder, taxInclusive: productDeliveryRules.taxInclusive }).from(productDeliveryRules).where(and(eq(productDeliveryRules.productId, product.id), eq(productDeliveryRules.isActive, true))).orderBy(asc(productDeliveryRules.sortOrder)),
    ]);
    const sectionIds = new Set(sections.map((section) => section.id));
    return jsonOk({ ...product, variants, images, contentSections: sections.map((section) => ({ ...section, items: contentItems.filter((item) => item.sectionId === section.id) })), addons: productAddonRows, deliveryRules, configuration: product.configuration, hasStructuredContent: sectionIds.size > 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
