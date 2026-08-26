import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { addons, artworkRequirements, pricingRules, productAddons, productContentItems, productContentSections, productDeliveryRules, productImages, products } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { adminPricingSchema, artworkRequirementSchema, productAddonSchema, productContentItemSchema, productContentSectionSchema, productDeliveryRuleSchema, productImageSchema } from "@/lib/validation";

const resourceSchema = z.enum(["IMAGE", "SECTION", "SECTION_ITEM", "ADDON", "DELIVERY_RULE", "PRICING_RULE", "ARTWORK_REQUIREMENT"]);
const mutationSchema = z.object({ resource: resourceSchema, id: z.string().uuid().optional(), data: z.record(z.string(), z.unknown()) });

async function productExists(id: string) {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
  return Boolean(product);
}

async function productOwnsSectionItem(productId: string, itemId: string) {
  const [item] = await db
    .select({ id: productContentItems.id })
    .from(productContentItems)
    .innerJoin(productContentSections, eq(productContentItems.sectionId, productContentSections.id))
    .where(and(eq(productContentItems.id, itemId), eq(productContentSections.productId, productId)))
    .limit(1);
  return Boolean(item);
}

async function productOwnsPricingRule(productId: string, ruleId: string) {
  const [rule] = await db.select({ id: pricingRules.id }).from(pricingRules).where(and(eq(pricingRules.id, ruleId), eq(pricingRules.productId, productId))).limit(1);
  return Boolean(rule);
}

export async function GET(request: Request, ctx: RouteContext<"/api/admin/products/[id]/catalog">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    if (!await productExists(id)) return jsonError("Product not found", 404);
    const [images, sections, contentItems, mappedAddons, deliveryRules, rules, requirements] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder)),
      db.select().from(productContentSections).where(eq(productContentSections.productId, id)).orderBy(asc(productContentSections.sortOrder)),
      db.select().from(productContentItems).orderBy(asc(productContentItems.sortOrder)),
      db.select({ mapping: productAddons, addon: addons }).from(productAddons).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(eq(productAddons.productId, id)).orderBy(asc(productAddons.sortOrder)),
      db.select().from(productDeliveryRules).where(eq(productDeliveryRules.productId, id)).orderBy(asc(productDeliveryRules.sortOrder)),
      db.select().from(pricingRules).where(eq(pricingRules.productId, id)).orderBy(asc(pricingRules.createdAt)),
      db.select().from(artworkRequirements).where(eq(artworkRequirements.productId, id)).orderBy(asc(artworkRequirements.createdAt)),
    ]);
    return jsonOk({ images, sections: sections.map((section) => ({ ...section, items: contentItems.filter((item) => item.sectionId === section.id) })), addons: mappedAddons, deliveryRules, pricingRules: rules, artworkRequirements: requirements });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/admin/products/[id]/catalog">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: productId } = await ctx.params;
    if (!await productExists(productId)) return jsonError("Product not found", 404);
    const input = await readBody(request, mutationSchema);
    if (input.resource === "IMAGE") {
      const data = productImageSchema.parse(input.data);
      const image = await db.transaction(async (tx) => { if (data.isPrimary) await tx.update(productImages).set({ isPrimary: false, updatedAt: new Date() }).where(eq(productImages.productId, productId)); return (await tx.insert(productImages).values({ ...data, productId }).returning())[0]; });
      return image ? jsonOk(image, 201) : jsonError("Image was not created", 500);
    }
    if (input.resource === "SECTION") {
      const [section] = await db.insert(productContentSections).values({ ...productContentSectionSchema.parse(input.data), productId }).returning();
      return section ? jsonOk(section, 201) : jsonError("Section was not created", 500);
    }
    if (input.resource === "SECTION_ITEM") {
      const data = productContentItemSchema.extend({ sectionId: z.string().uuid() }).parse(input.data);
      const [section] = await db.select().from(productContentSections).where(and(eq(productContentSections.id, data.sectionId), eq(productContentSections.productId, productId))).limit(1);
      if (!section) return jsonError("Section not found", 404);
      const [item] = await db.insert(productContentItems).values(data).returning();
      return item ? jsonOk(item, 201) : jsonError("Content item was not created", 500);
    }
    if (input.resource === "ADDON") {
      const data = productAddonSchema.parse(input.data);
      if (data.pricingRuleId && !await productOwnsPricingRule(productId, data.pricingRuleId)) return jsonError("Pricing configuration not found", 404);
      const [mapping] = await db.insert(productAddons).values({ ...data, productId }).returning();
      return mapping ? jsonOk(mapping, 201) : jsonError("Add-on mapping was not created", 500);
    }
    if (input.resource === "DELIVERY_RULE") {
      const data = productDeliveryRuleSchema.parse(input.data);
      const [rule] = await db.insert(productDeliveryRules).values({ ...data, stateCode: data.stateCode.toUpperCase(), productId }).returning();
      return rule ? jsonOk(rule, 201) : jsonError("Delivery rule was not created", 500);
    }
    if (input.resource === "ARTWORK_REQUIREMENT") {
      const data = artworkRequirementSchema.parse(input.data);
      if (data.pricingRuleId && !await productOwnsPricingRule(productId, data.pricingRuleId)) return jsonError("Pricing configuration not found", 404);
      const [requirement] = await db.insert(artworkRequirements).values({ ...data, productId, scopeKey: data.pricingRuleId ?? "PRODUCT" }).onConflictDoUpdate({ target: [artworkRequirements.productId, artworkRequirements.scopeKey], set: { ...data, updatedAt: new Date() } }).returning();
      return requirement ? jsonOk(requirement, 201) : jsonError("Artwork requirement was not created", 500);
    }
    const [rule] = await db.insert(pricingRules).values({ ...adminPricingSchema.omit({ productId: true }).parse(input.data), productId }).returning();
    return rule ? jsonOk(rule, 201) : jsonError("Pricing rule was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/products/[id]/catalog">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: productId } = await ctx.params;
    if (!await productExists(productId)) return jsonError("Product not found", 404);
    const input = await readBody(request, mutationSchema.refine((value) => Boolean(value.id), { message: "id is required" }));
    if (input.resource === "IMAGE") {
      const data = productImageSchema.partial().parse(input.data);
      const image = await db.transaction(async (tx) => { if (data.isPrimary) await tx.update(productImages).set({ isPrimary: false, updatedAt: new Date() }).where(eq(productImages.productId, productId)); return (await tx.update(productImages).set({ ...data, updatedAt: new Date() }).where(and(eq(productImages.id, input.id!), eq(productImages.productId, productId))).returning())[0]; });
      return image ? jsonOk(image) : jsonError("Image not found", 404);
    }
    if (input.resource === "SECTION") {
      const [section] = await db.update(productContentSections).set({ ...productContentSectionSchema.partial().parse(input.data), updatedAt: new Date() }).where(and(eq(productContentSections.id, input.id!), eq(productContentSections.productId, productId))).returning();
      return section ? jsonOk(section) : jsonError("Section not found", 404);
    }
    if (input.resource === "SECTION_ITEM") {
      if (!await productOwnsSectionItem(productId, input.id!)) return jsonError("Content item not found", 404);
      const [item] = await db.update(productContentItems).set({ ...productContentItemSchema.partial().parse(input.data), updatedAt: new Date() }).where(eq(productContentItems.id, input.id!)).returning();
      return item ? jsonOk(item) : jsonError("Content item not found", 404);
    }
    if (input.resource === "ADDON") {
      const data = productAddonSchema.partial().parse(input.data);
      if (data.pricingRuleId && !await productOwnsPricingRule(productId, data.pricingRuleId)) return jsonError("Pricing configuration not found", 404);
      const [mapping] = await db.update(productAddons).set({ ...data, updatedAt: new Date() }).where(and(eq(productAddons.id, input.id!), eq(productAddons.productId, productId))).returning();
      return mapping ? jsonOk(mapping) : jsonError("Add-on mapping not found", 404);
    }
    if (input.resource === "DELIVERY_RULE") {
      const data = productDeliveryRuleSchema.partial().parse(input.data);
      const [rule] = await db.update(productDeliveryRules).set({ ...data, ...(data.stateCode ? { stateCode: data.stateCode.toUpperCase() } : {}), updatedAt: new Date() }).where(and(eq(productDeliveryRules.id, input.id!), eq(productDeliveryRules.productId, productId))).returning();
      return rule ? jsonOk(rule) : jsonError("Delivery rule not found", 404);
    }
    if (input.resource === "ARTWORK_REQUIREMENT") {
      const data = artworkRequirementSchema.partial().parse(input.data);
      if (data.pricingRuleId && !await productOwnsPricingRule(productId, data.pricingRuleId)) return jsonError("Pricing configuration not found", 404);
      const [requirement] = await db.update(artworkRequirements).set({ ...data, ...(data.pricingRuleId !== undefined ? { scopeKey: data.pricingRuleId ?? "PRODUCT" } : {}), updatedAt: new Date() }).where(and(eq(artworkRequirements.id, input.id!), eq(artworkRequirements.productId, productId))).returning();
      return requirement ? jsonOk(requirement) : jsonError("Artwork requirement not found", 404);
    }
    const [rule] = await db.update(pricingRules).set({ ...adminPricingSchema.omit({ productId: true }).partial().parse(input.data), updatedAt: new Date() }).where(and(eq(pricingRules.id, input.id!), eq(pricingRules.productId, productId))).returning();
    return rule ? jsonOk(rule) : jsonError("Pricing rule not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/products/[id]/catalog">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id: productId } = await ctx.params;
    if (!await productExists(productId)) return jsonError("Product not found", 404);
    const input = await readBody(request, z.object({ resource: resourceSchema, id: z.string().uuid() }));
    if (input.resource === "IMAGE") await db.delete(productImages).where(and(eq(productImages.id, input.id), eq(productImages.productId, productId)));
    else if (input.resource === "SECTION") await db.delete(productContentSections).where(and(eq(productContentSections.id, input.id), eq(productContentSections.productId, productId)));
    else if (input.resource === "SECTION_ITEM") {
      if (!await productOwnsSectionItem(productId, input.id)) return jsonError("Content item not found", 404);
      await db.delete(productContentItems).where(eq(productContentItems.id, input.id));
    }
    else if (input.resource === "ADDON") await db.delete(productAddons).where(and(eq(productAddons.id, input.id), eq(productAddons.productId, productId)));
    else if (input.resource === "DELIVERY_RULE") await db.delete(productDeliveryRules).where(and(eq(productDeliveryRules.id, input.id), eq(productDeliveryRules.productId, productId)));
    else if (input.resource === "ARTWORK_REQUIREMENT") await db.delete(artworkRequirements).where(and(eq(artworkRequirements.id, input.id), eq(artworkRequirements.productId, productId)));
    else await db.delete(pricingRules).where(and(eq(pricingRules.id, input.id), eq(pricingRules.productId, productId)));
    return jsonOk({ deleted: true, id: input.id });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
