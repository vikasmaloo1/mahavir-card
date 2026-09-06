import { and, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { calculateCartSelection } from "@/lib/cart-service";
import { db } from "@/lib/db/server";
import { cartItems, carts, customers, products, savedJobs } from "@/lib/db/schema";
import { normalizeProductQuantity } from "@/lib/quantity-helper";
import { requireUser } from "@/lib/permissions";

/**
 * Adds a saved job to the customer's PURCHASE basket, re-running live pricing —
 * same pricing-safety guarantee as reorder (src/app/api/orders/[id]/reorder):
 * a saved job's stored quantity/configuration is never trusted for price, only
 * for what to configure.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/account/saved-jobs/[id]/order-again">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;

    const [customer] = await db.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonError("Complete your customer profile before ordering", 422);

    const [job] = await db.select().from(savedJobs).where(and(eq(savedJobs.id, id), eq(savedJobs.customerId, customer.id))).limit(1);
    if (!job) return jsonError("Saved job not found", 404);

    const [product] = await db.select().from(products).where(eq(products.id, job.productId)).limit(1);
    if (!product?.isActive || product.status !== "ACTIVE" || !product.orderable) return jsonError("This product is no longer available to order", 422);

    await db.insert(carts).values({ userId: session.user.id, kind: "PURCHASE" }).onConflictDoNothing();
    const [cart] = await db.select().from(carts).where(and(eq(carts.userId, session.user.id), eq(carts.kind, "PURCHASE"))).limit(1);
    if (!cart) return jsonError("Basket could not be prepared", 500);

    const { normalizedQuantity } = normalizeProductQuantity(job.quantity, null, product.slug);
    const configuration = { ...(job.configuration as Record<string, unknown> ?? {}), quantity: String(normalizedQuantity) };
    const price = await calculateCartSelection(job.productId, normalizedQuantity, configuration, session.user.id);

    const [item] = await db.insert(cartItems).values({
      cartId: cart.id,
      productId: job.productId,
      quantity: normalizedQuantity,
      jobName: job.name,
      configuration,
      calculatedAmount: price?.calculatedAmount ?? null,
      pricingSnapshot: price ?? {},
    }).returning();

    return item ? jsonOk(item, 201) : jsonError("This job could not be added to your basket", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
