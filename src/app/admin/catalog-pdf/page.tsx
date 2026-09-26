import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getAdminAccess } from "@/lib/permissions";
import { getCatalogModel } from "@/lib/catalog-model";
import {
  AdminPriceCatalogDocument,
  type CatalogCategoryGroup,
  type CatalogProductItem,
} from "@/components/admin-price-catalog-document";

export const metadata: Metadata = {
  title: "Price Catalogue & Specification Directory (PDF) | Mahavir Card Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Internal price directory for staff.
 *
 * Built from the same CatalogModel as /catalog and the PDF export, so the rates printed here
 * are the live database rates. It used to assemble itself from the static rate-catalog files,
 * which had drifted: three trade rates were 100 rupees stale and one product sat in the wrong
 * category, meaning staff could quote from a price list the rest of the app disagreed with.
 */
export default async function AdminCatalogPdfPage() {
  const requestHeaders = await headers();
  const access = await getAdminAccess(new Request("http://localhost/admin", { headers: requestHeaders }));
  if (!access) redirect("/admin/login");

  const model = await getCatalogModel();

  const categoryGroups: CatalogCategoryGroup[] = model.categories.map((category) => {
    const products: CatalogProductItem[] = category.products.map((product) => {
      const shape = product.retail ?? product.trade;
      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        categorySlug: product.categorySlug,
        categoryName: product.categoryName,
        shortDescription: product.shortDescription,
        productionTime: product.productionTime || "3-4 working days",
        referenceQuantity: shape?.referenceQuantity ?? 1000,
        ruleType: shape?.ruleType ?? "FIXED",
        amount: product.retail?.amount ?? undefined,
        ratePerSqInch: product.retail?.ratePerSqInch ?? undefined,
        rateUnit: shape?.rateUnit,
        b2bAmount: product.trade?.amount ?? undefined,
        b2bRatePerSqInch: product.trade?.ratePerSqInch ?? undefined,
        size: product.size,
        imageUrl: product.imageUrl,
        addon: product.addon,
        bladeCharge: shape?.bladeCharge ?? undefined,
        minimumCharge: shape?.minimumCharge ?? undefined,
      };
    });

    return {
      slug: category.slug,
      name: category.name,
      description: category.description,
      products,
    };
  });

  const b = model.businessInfo;
  const businessInfo = {
    name: b.name,
    tagline: b.tagline,
    address: b.address,
    city: b.city,
    state: b.state,
    postalCode: b.postalCode,
    phone: `${b.whatsappPhone} / ${b.primaryPhone}`,
    email: b.email,
    website: b.website,
    gstin: b.gstin,
    stateCode: "24 (Gujarat)",
  };

  return <AdminPriceCatalogDocument categories={categoryGroups} businessInfo={businessInfo} />;
}
