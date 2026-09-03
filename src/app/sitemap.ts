import type { MetadataRoute } from "next";

import { db } from "@/lib/db/server";
import { products } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { catalogCategories } from "@/lib/catalog-routing";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://mahavircard.in";

  const activeProducts = await db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.status, "ACTIVE")));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...catalogCategories.map((category) => ({
      url: `${baseUrl}/products?category=${category.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...activeProducts.map((product) => ({
      url: `${baseUrl}/catalog/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
