import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { customers, products, savedJobs } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { savedJobCreateSchema } from "@/lib/validation";

/**
 * A customer's named, reusable job snapshots (e.g. "ABC Company Visiting Card") —
 * product + configuration + quantity captured once, "Order Again" skips
 * reconfiguration entirely by reusing the exact same live-pricing cart-insert
 * path as reorder (see [id]/order-again/route.ts).
 */
export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonOk({ items: [] });

    const items = await db
      .select({
        id: savedJobs.id,
        name: savedJobs.name,
        productId: savedJobs.productId,
        configuration: savedJobs.configuration,
        quantity: savedJobs.quantity,
        createdAt: savedJobs.createdAt,
        productName: products.name,
        productSlug: products.slug,
        productImageUrl: products.imageUrl,
        productOrderable: products.orderable,
        productIsActive: products.isActive,
        productStatus: products.status,
      })
      .from(savedJobs)
      .innerJoin(products, eq(savedJobs.productId, products.id))
      .where(eq(savedJobs.customerId, customer.id))
      .orderBy(asc(savedJobs.sortOrder), asc(savedJobs.createdAt));

    return jsonOk({ items });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, savedJobCreateSchema);
    const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, session.user.id)).limit(1);
    if (!customer) return jsonError("Complete your customer profile before saving a job", 422);

    const [product] = await db.select({ id: products.id }).from(products).where(and(eq(products.id, input.productId), eq(products.isActive, true))).limit(1);
    if (!product) return jsonError("Product not found", 404);

    const [job] = await db.insert(savedJobs).values({
      customerId: customer.id,
      productId: input.productId,
      name: input.name,
      configuration: input.configuration,
      quantity: input.quantity,
    }).returning();

    return job ? jsonOk(job, 201) : jsonError("Job could not be saved", 500);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
