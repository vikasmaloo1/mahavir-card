export type SearchLogRow = { query: string; normalizedQuery: string | null; confidence: string };

/** Groups no-result searches by normalized query, most-frequent first — answers "what are customers searching for that we don't sell." */
export function topNoResultQueries(rows: SearchLogRow[], limit = 20): Array<{ query: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.confidence !== "NONE") continue;
    const key = row.normalizedQuery || row.query;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([query, count]) => ({ query, count }));
}

export type QuoteStatusRow = { status: string; count: number };

/** Turns per-status counts into a funnel summary with a conversion rate, rounded to one decimal. */
export function quoteFunnelSummary(rows: QuoteStatusRow[]) {
  const funnel = Object.fromEntries(rows.map((row) => [row.status, row.count]));
  const totalQuotes = rows.reduce((sum, row) => sum + row.count, 0);
  const converted = funnel["CONVERTED_TO_ORDER"] ?? 0;
  const conversionRate = totalQuotes ? Math.round((converted / totalQuotes) * 1000) / 10 : 0;
  return { funnel, totalQuotes, conversionRate };
}
