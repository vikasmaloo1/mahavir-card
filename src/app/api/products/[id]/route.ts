import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addons, artworkRequirements, artworkSlots, pricingRules, productAddons, productContentItems, productContentSections, productDeliveryRules, productImages, products, productVariants } from "@/lib/db/schema";
import { deriveStartingPrice } from "@/lib/product-listing-pricing";
import { requireUser } from "@/lib/permissions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request, ctx: RouteContext<"/api/products/[id]">) {
  try {
    await requireUser(request);
    const authenticated = true;
    const { id } = await ctx.params;
    const [product] = await db.select().from(products).where(and(uuidPattern.test(id) ? eq(products.id, id) : eq(products.slug, id), eq(products.isActive, true), eq(products.status, "ACTIVE"))).limit(1);
    if (!product) return jsonError("Product not found", 404);
    const [variants, images, sections, contentItems, productAddonRows, deliveryRules, rules, requirements, slots] = await Promise.all([
      db.select().from(productVariants).where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true))),
      db.select().from(productImages).where(eq(productImages.productId, product.id)).orderBy(asc(productImages.sortOrder)),
      db.select().from(productContentSections).where(eq(productContentSections.productId, product.id)).orderBy(asc(productContentSections.sortOrder)),
      db.select().from(productContentItems).orderBy(asc(productContentItems.sortOrder)),
      db.select({ id: productAddons.id, pricingRuleId: productAddons.pricingRuleId, addonId: productAddons.addonId, name: addons.name, description: addons.description, pricingType: addons.pricingType, price: productAddons.price, isDefault: productAddons.isDefault, sortOrder: productAddons.sortOrder, taxInclusive: productAddons.taxInclusive }).from(productAddons).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.productId, product.id), eq(productAddons.isActive, true), eq(addons.isActive, true))).orderBy(asc(productAddons.sortOrder)),
      db.select({ id: productDeliveryRules.id, deliveryMethod: productDeliveryRules.deliveryMethod, stateCode: productDeliveryRules.stateCode, price: productDeliveryRules.price, sortOrder: productDeliveryRules.sortOrder, taxInclusive: productDeliveryRules.taxInclusive }).from(productDeliveryRules).where(and(eq(productDeliveryRules.productId, product.id), eq(productDeliveryRules.isActive, true))).orderBy(asc(productDeliveryRules.sortOrder)),
      db.select({ id: pricingRules.id, productId: pricingRules.productId, variantId: pricingRules.variantId, variantActive: productVariants.isActive, name: pricingRules.name, conditions: pricingRules.conditions, priceFormula: pricingRules.priceFormula, taxInclusive: pricingRules.taxInclusive, isActive: pricingRules.isActive }).from(pricingRules).leftJoin(productVariants, eq(pricingRules.variantId, productVariants.id)).where(and(eq(pricingRules.productId, product.id), eq(pricingRules.isActive, true))).orderBy(asc(pricingRules.createdAt)),
      db.select().from(artworkRequirements).where(and(eq(artworkRequirements.productId, product.id), eq(artworkRequirements.isActive, true))),
      db.select({ slot: artworkSlots, productId: artworkRequirements.productId }).from(artworkSlots).innerJoin(artworkRequirements, eq(artworkSlots.artworkRequirementId, artworkRequirements.id)).where(and(eq(artworkRequirements.productId, product.id), eq(artworkSlots.isActive, true))).orderBy(asc(artworkSlots.sortOrder)),
    ]);
    const sectionIds = new Set(sections.map((section) => section.id));
    const priceSummary = authenticated ? deriveStartingPrice(product, rules) : { startingPrice: null, startingQuantity: null, currency: "INR", priceLabel: "Login to view price", priceState: "LOGIN", taxInclusive: null };
    return jsonOk({ ...product, ...priceSummary, authenticated, variants, images, contentSections: sections.map((section) => ({ ...section, items: contentItems.filter((item) => item.sectionId === section.id) })), addons: productAddonRows.map((addon) => authenticated ? addon : { ...addon, price: null }), deliveryRules: deliveryRules.map((rule) => authenticated ? rule : { ...rule, price: null }), pricingRules: rules.map((rule) => authenticated ? rule : { ...rule, priceFormula: {} }), artworkRequirements: requirements.map((requirement) => ({ ...requirement, slots: slots.filter((row) => row.slot.artworkRequirementId === requirement.id).map((row) => row.slot) })), configuration: product.configuration, hasStructuredContent: sectionIds.size > 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
