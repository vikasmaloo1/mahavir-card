import { desc, eq, inArray, sql } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { quoteFunnelSummary, topNoResultQueries } from "@/lib/analytics-helpers";
import { db } from "@/lib/db/server";
import { addons, orderItems, orders, products, quotes, searchLogs } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";

/**
 * Read-only reports computed on demand — admin-only, low traffic, no new
 * aggregation tables. Bounded lookback windows keep this cheap: the last 1000
 * search logs and last 500 order lines are plenty for a business-visibility
 * summary and avoid an unbounded full-table scan.
 */
export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);

    const [searchRows, quoteRows, orderLines] = await Promise.all([
      db.select({ query: searchLogs.query, normalizedQuery: searchLogs.normalizedQuery, confidence: searchLogs.confidence, customerState: searchLogs.customerState, customerType: searchLogs.customerType }).from(searchLogs).orderBy(desc(searchLogs.createdAt)).limit(1000),
      db.select({ status: quotes.status, count: sql<number>`count(*)::int` }).from(quotes).groupBy(quotes.status),
      db.select({ productId: orderItems.productId, productName: products.name, quantity: orderItems.quantity, configuration: orderItems.configuration, deliveryState: orders.deliveryState, customerId: orders.customerId })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .leftJoin(products, eq(orderItems.productId, products.id))
        .orderBy(desc(orders.createdAt))
        .limit(500),
    ]);

    // Search: confidence breakdown + top no-result queries — answers "what are
    // customers searching for that we don't sell online."
    const confidenceBreakdown = { HIGH: 0, PARTIAL: 0, NONE: 0 } as Record<string, number>;
    const stateCounts = new Map<string, number>();
    for (const row of searchRows) {
      confidenceBreakdown[row.confidence] = (confidenceBreakdown[row.confidence] ?? 0) + 1;
      if (row.customerState) stateCounts.set(row.customerState, (stateCounts.get(row.customerState) ?? 0) + 1);
    }
    const topNoResultSearches = topNoResultQueries(searchRows);

    // Quotes: funnel counts by status, plus a simple conversion rate.
    const { funnel: quoteFunnel, totalQuotes, conversionRate } = quoteFunnelSummary(quoteRows);

    // Products: most ordered by line count, popular add-ons/quantities parsed from
    // the configuration JSON already stored on each order line (no extra joins).
    const productCounts = new Map<string, { name: string; lines: number; totalQuantity: number }>();
    const addonCounts = new Map<string, number>();
    const quantityCounts = new Map<number, number>();
    const deliveryStateCounts = new Map<string, number>();
    const productCustomerLines = new Map<string, number>();
    for (const line of orderLines) {
      if (line.productId) {
        const entry = productCounts.get(line.productId) ?? { name: line.productName ?? "Unknown product", lines: 0, totalQuantity: 0 };
        entry.lines += 1;
        entry.totalQuantity += line.quantity;
        productCounts.set(line.productId, entry);
        if (line.customerId) {
          const key = `${line.productId}:${line.customerId}`;
          productCustomerLines.set(key, (productCustomerLines.get(key) ?? 0) + 1);
        }
      }
      quantityCounts.set(line.quantity, (quantityCounts.get(line.quantity) ?? 0) + 1);
      if (line.deliveryState) deliveryStateCounts.set(line.deliveryState, (deliveryStateCounts.get(line.deliveryState) ?? 0) + 1);
      const config = (line.configuration ?? {}) as Record<string, unknown>;
      const addonIds = Array.isArray(config.addonIds) ? config.addonIds : [];
      for (const addonId of addonIds) {
        if (typeof addonId === "string") addonCounts.set(addonId, (addonCounts.get(addonId) ?? 0) + 1);
      }
    }
    const reorderCounts = new Map<string, number>();
    for (const [key] of productCustomerLines) {
      const [productId] = key.split(":");
      if ((productCustomerLines.get(key) ?? 0) >= 2) reorderCounts.set(productId, (reorderCounts.get(productId) ?? 0) + 1);
    }
    const mostReorderedProducts = [...reorderCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([productId, customers]) => ({ productId, name: productCounts.get(productId)?.name ?? "Unknown product", customers }));
    const mostOrderedProducts = [...productCounts.entries()].sort((a, b) => b[1].lines - a[1].lines).slice(0, 10).map(([productId, data]) => ({ productId, ...data }));
    const popularQuantities = [...quantityCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([quantity, count]) => ({ quantity, count }));
    const stateDemand = [...deliveryStateCounts.entries()].sort((a, b) => b[1] - a[1]).map(([state, count]) => ({ state, count }));
    const topAddonIds = [...addonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const addonNames = topAddonIds.length ? await db.select({ id: addons.id, name: addons.name }).from(addons).where(inArray(addons.id, topAddonIds.map(([id]) => id))) : [];
    const popularAddons = topAddonIds.map(([id, count]) => ({ addonId: id, name: addonNames.find((row) => row.id === id)?.name ?? "Unknown add-on", count }));

    return jsonOk({
      search: { confidenceBreakdown, topNoResultSearches, searchStateDemand: [...stateCounts.entries()].sort((a, b) => b[1] - a[1]).map(([state, count]) => ({ state, count })), totalSearches: searchRows.length },
      quotes: { funnel: quoteFunnel, totalQuotes, conversionRate },
      products: { mostOrderedProducts, mostReorderedProducts, popularQuantities, stateDemand, popularAddons },
    });
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
