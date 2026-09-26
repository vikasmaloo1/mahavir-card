import "server-only";

import { and, eq } from "drizzle-orm";

import { getCachedSession } from "@/lib/auth/session";
import { resolveCatalogMode as narrowMode, type CatalogPriceMode } from "@/lib/catalog-pricing";
import { db } from "@/lib/db/server";
import { admins, customers } from "@/lib/db/schema";

/**
 * Who may see which catalogue edition.
 *
 * The catalogue carries live trade and retail rates, so it is not public: a signed-out
 * visitor gets nothing. A trade account sees only trade rates, a retail account sees only
 * retail rates, and staff may switch between all three editions including the price-free
 * showroom one. The API route and the page both derive their modes from here, so the
 * download cannot be used to reach an edition the page would not show.
 */
export type CatalogViewer = {
  allowedModes: CatalogPriceMode[];
  defaultMode: CatalogPriceMode;
  isAdmin: boolean;
  customerType: "B2B" | "B2C" | null;
};

const ADMIN_MODES: CatalogPriceMode[] = ["RETAIL", "B2B", "SHOWROOM"];

/** Returns null when nobody is signed in — callers redirect to login rather than render. */
export async function getCatalogViewer(): Promise<CatalogViewer | null> {
  const session = await getCachedSession();
  if (!session?.user?.id) return null;

  const [[admin], [customer]] = await Promise.all([
    db
      .select({ id: admins.id })
      .from(admins)
      .where(and(eq(admins.userId, session.user.id), eq(admins.status, "ACTIVE")))
      .limit(1),
    db
      .select({ customerType: customers.customerType })
      .from(customers)
      .where(eq(customers.userId, session.user.id))
      .limit(1),
  ]);

  if (admin) {
    return { allowedModes: ADMIN_MODES, defaultMode: "RETAIL", isAdmin: true, customerType: null };
  }

  // A trade account must not see retail rates, and vice versa. Anyone signed in without a
  // customer record yet falls back to retail, which is the rate we quote publicly.
  const customerType = customer?.customerType === "B2B" ? "B2B" : "B2C";
  const mode: CatalogPriceMode = customerType === "B2B" ? "B2B" : "RETAIL";
  return { allowedModes: [mode], defaultMode: mode, isAdmin: false, customerType };
}

/** Narrows a requested mode to one this viewer is allowed to see. */
export function resolveCatalogMode(viewer: CatalogViewer, requested: string | null): CatalogPriceMode {
  return narrowMode(viewer.allowedModes, viewer.defaultMode, requested);
}
