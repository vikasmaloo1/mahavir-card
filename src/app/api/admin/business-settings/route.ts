import { eq } from "drizzle-orm";

import { handleApiError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import { brandingAssets, businessSettings } from "@/lib/db/schema";
import { requireRole } from "@/lib/permissions";
import { businessSettingsSchema } from "@/lib/validation";

async function readSettings() {
  const [settings] = await db.select().from(businessSettings).where(eq(businessSettings.id, "primary")).limit(1);
  const assets = await db.select({ id: brandingAssets.id, assetKey: brandingAssets.assetKey, imageUrl: brandingAssets.imageUrl, altText: brandingAssets.altText }).from(brandingAssets).where(eq(brandingAssets.isActive, true));
  return { settings: settings ?? { id: "primary", businessName: "Mahavir Card" }, assets };
}

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    return jsonOk(await readSettings());
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, businessSettingsSchema);
    await db.insert(businessSettings).values({ id: "primary", ...input, updatedBy: session.user.id }).onConflictDoUpdate({
      target: businessSettings.id,
      set: { ...input, updatedBy: session.user.id, updatedAt: new Date() },
    });
    return jsonOk(await readSettings());
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
