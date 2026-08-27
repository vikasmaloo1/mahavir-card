import { eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { brandingAssets, businessSettings } from "@/lib/db/schema";

export async function GET() {
  try {
    const [row] = await db.select({
      businessName: businessSettings.businessName,
      addressLine1: businessSettings.addressLine1,
      addressLine2: businessSettings.addressLine2,
      city: businessSettings.city,
      state: businessSettings.state,
      postalCode: businessSettings.postalCode,
      phone: businessSettings.phone,
      email: businessSettings.email,
      whatsapp: businessSettings.whatsapp,
      businessHours: businessSettings.businessHours,
      footerText: businessSettings.footerText,
      logoUrl: brandingAssets.imageUrl,
    }).from(businessSettings).leftJoin(brandingAssets, eq(businessSettings.logoAssetId, brandingAssets.id)).where(eq(businessSettings.id, "primary")).limit(1);
    return jsonOk(row ?? { businessName: "Mahavir Card" });
  } catch (error) { return handleApiError(error); }
}
