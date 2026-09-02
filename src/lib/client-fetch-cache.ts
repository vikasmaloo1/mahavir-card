"use client";

/**
 * Shared, short-lived client-side cache for GET requests that multiple
 * independent components fetch on mount within the same page visit
 * (account summary, payments config). Without this, navigating between
 * cart/checkout/account/quote re-fetches the same data from scratch in
 * every mounted component. Keyed by URL; a fresh in-flight request is
 * reused by concurrent callers, and results are kept for ttlMs so a
 * same-page remount doesn't re-fetch either.
 */
export type CachedResponse<T> = { status: number; ok: boolean; payload: T | null };

const inFlight = new Map<string, Promise<CachedResponse<unknown>>>();
const cached = new Map<string, { at: number; value: CachedResponse<unknown> }>();

export async function cachedFetchJson<T>(url: string, ttlMs = 15_000): Promise<CachedResponse<T>> {
  const hit = cached.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as CachedResponse<T>;

  const pending = inFlight.get(url);
  if (pending) return pending as Promise<CachedResponse<T>>;

  const request = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      const payload = await response.json().catch(() => null);
      const result: CachedResponse<unknown> = { status: response.status, ok: response.ok, payload };
      cached.set(url, { at: Date.now(), value: result });
      return result;
    })
    .finally(() => {
      inFlight.delete(url);
    });

  inFlight.set(url, request);
  return request as Promise<CachedResponse<T>>;
}

/** Call after a mutation (checkout, wallet top-up, profile save) that changes cached data. */
export function invalidateCachedFetch(url: string) {
  cached.delete(url);
  inFlight.delete(url);
}
