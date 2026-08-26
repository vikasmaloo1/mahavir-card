import { eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { products, productVariants } from "@/lib/db/schema";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, ctx: RouteContext<"/api/products/[id]">) {
  try {
    const { id } = await ctx.params;
    const [product] = await db.select().from(products).where(uuidPattern.test(id) ? eq(products.id, id) : eq(products.slug, id)).limit(1);
    if (!product) return jsonError("Product not found", 404);
    const variants = await db.select().from(productVariants).where(eq(productVariants.productId, product.id));
    return jsonOk({ ...product, variants });
  } catch (error) {
    return handleApiError(error);
  }
}
