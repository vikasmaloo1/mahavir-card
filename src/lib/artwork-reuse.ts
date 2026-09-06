export type ReusableArtworkRow = { id: string; fileName: string; artworkSlotKey: string; createdAt: Date | string };

/**
 * Reduces a customer's matching-artwork rows (already filtered by product +
 * pricing rule + ownership + status server-side) to one candidate per slot —
 * the most recent one, since `rows` is expected most-recent-first. Kept pure
 * and DB-free so it's testable without touching validateRequiredArtwork's
 * actual compatibility enforcement, which stays the single source of truth.
 */
export function pickReusableArtworkPerSlot(rows: ReusableArtworkRow[]): Array<{ id: string; fileName: string; slotKey: string }> {
  const bySlot = new Map<string, { id: string; fileName: string; slotKey: string }>();
  for (const row of rows) {
    if (!bySlot.has(row.artworkSlotKey)) bySlot.set(row.artworkSlotKey, { id: row.id, fileName: row.fileName, slotKey: row.artworkSlotKey });
  }
  return [...bySlot.values()];
}
