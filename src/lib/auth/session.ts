import "server-only";

import { cache } from "react";
import { headers } from "next/headers";

import { auth } from "@/lib/auth/server";

/**
 * Request-scoped session lookup. Every page and StorefrontHeader independently
 * called auth.api.getSession before this existed, doubling the session-store
 * round trip on every navigation. next/headers() already returns the same
 * cached object within a request, so wrapping the lookup in React's cache()
 * de-dupes it across every caller in this render pass.
 */
export const getCachedSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});
