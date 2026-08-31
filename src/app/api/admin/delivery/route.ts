import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { productDeliveryRules, products } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { productDeliveryRuleSchema } from "@/lib/validation";
import { indiaStateName } from "@/lib/india-states";

const createSchema = productDeliveryRuleSchema.extend({ productId: z.string().uuid() });
const updateSchema = productDeliveryRuleSchema.partial().extend({ productId: z.string().uuid() });

async function hasProduct(productId: string) {
  const [product] = await db.select({ id: products.id }).from(products).where(eq(products.id, productId)).limit(1);
  return Boolean(product);
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const productId = new URL(request.url).searchParams.get("productId");
    const where = productId ? eq(productDeliveryRules.productId, productId) : undefined;
    const data = await db
      .select({ rule: productDeliveryRules, productName: products.name, productSlug: products.slug })
      .from(productDeliveryRules)
      .innerJoin(products, eq(productDeliveryRules.productId, products.id))
      .where(where)
      .orderBy(asc(products.name), asc(productDeliveryRules.sortOrder));
    return jsonOk(data.map(({ rule, productName, productSlug }) => ({ ...rule, productName, productSlug, stateName: rule.stateCode === "*" ? "All / Pickup" : indiaStateName(rule.stateCode) })));
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, createSchema);
    if (!await hasProduct(input.productId)) return jsonError("Product not found", 404);
    const [rule] = await db.insert(productDeliveryRules).values({ ...input, stateCode: input.stateCode.toUpperCase() }).returning();
    return rule ? jsonOk(rule, 201) : jsonError("Delivery rule was not created", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("Delivery rule id is required", 422);
    const input = await readBody(request, updateSchema);
    if (!await hasProduct(input.productId)) return jsonError("Product not found", 404);
    const [rule] = await db.update(productDeliveryRules).set({ ...input, ...(input.stateCode ? { stateCode: input.stateCode.toUpperCase() } : {}), updatedAt: new Date() }).where(and(eq(productDeliveryRules.id, id), eq(productDeliveryRules.productId, input.productId))).returning();
    return rule ? jsonOk(rule) : jsonError("Delivery rule not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const params = new URL(request.url).searchParams;
    const id = params.get("id");
    const productId = params.get("productId");
    if (!id || !productId) return jsonError("Delivery rule id and product id are required", 422);
    const [rule] = await db.delete(productDeliveryRules).where(and(eq(productDeliveryRules.id, id), eq(productDeliveryRules.productId, productId))).returning();
    return rule ? jsonOk({ deleted: true, id }) : jsonError("Delivery rule not found", 404);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
