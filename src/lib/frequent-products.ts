export type OrderedProductRow = {
  productId: string | null;
  quantity: number;
  configuration: Record<string, unknown>;
  productName: string | null;
  productSlug: string | null;
  productImageUrl: string | null;
  productOrderable: boolean;
  productIsActive: boolean;
  productStatus: string;
};

export type FrequentProduct = {
  productId: string;
  name: string | null;
  slug: string | null;
  imageUrl: string | null;
  orderCount: number;
  quantity: number;
  configuration: Record<string, unknown>;
};

/**
 * Groups a customer's order-line history by product, counting how often each
 * orderable+active product was bought, sorted most-frequent first. Ties broken by
 * recency (rows are assumed most-recent-first, matching recent-products' query order).
 * Kept as a pure function so it's testable without a database.
 */
export function groupFrequentProducts(rows: OrderedProductRow[], limit = 5): FrequentProduct[] {
  const byProduct = new Map<string, { count: number; first: OrderedProductRow }>();
  for (const row of rows) {
    if (!row.productId) continue;
    if (!row.productIsActive || row.productStatus !== "ACTIVE" || !row.productOrderable) continue;
    const existing = byProduct.get(row.productId);
    if (existing) existing.count += 1;
    else byProduct.set(row.productId, { count: 1, first: row });
  }
  return [...byProduct.entries()]
    .filter(([, entry]) => entry.count > 1)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([productId, entry]) => ({
      productId,
      name: entry.first.productName,
      slug: entry.first.productSlug,
      imageUrl: entry.first.productImageUrl,
      orderCount: entry.count,
      quantity: entry.first.quantity,
      configuration: entry.first.configuration,
    }));
}
