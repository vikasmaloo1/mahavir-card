import "server-only";

import { and, eq, or } from "drizzle-orm";

import { customers, quotes } from "@/lib/db/schema";
import { db } from "@/lib/db/server";

/**
 * A quote belongs to a caller if it's tied directly to their userId (created before
 * a customer profile existed) or to their customer record. Checking only userId
 * (as an earlier version of the quotes list route did) misses quotes attached only
 * via customerId — this is the single ownership condition every quote route should use.
 */
export async function quoteOwnershipCondition(userId: string, quoteId?: string) {
  const [customer] = await db.select({ id: customers.id }).from(customers).where(eq(customers.userId, userId)).limit(1);
  const ownership = customer ? or(eq(quotes.userId, userId), eq(quotes.customerId, customer.id)) : eq(quotes.userId, userId);
  return quoteId ? and(eq(quotes.id, quoteId), ownership) : ownership;
}
