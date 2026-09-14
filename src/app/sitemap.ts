import type { MetadataRoute } from "next";
import { and, eq, max } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { categories, products } from "@/lib/db/schema";
import { seoCategoryPages } from "@/lib/seo-categories";

const SITE = "https://mahavircard.in";

// Bump when the copy on a static page changes. Using `new Date()` here would falsely claim
// every page changed on every crawl, which Google learns to ignore.
const STATIC_CONTENT_UPDATED = new Date("2026-09-12T00:00:00+05:30");

const staticPages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
  { path: "", changeFrequency: "weekly", priority: 1.0 },
  { path: "/commercial-offset-printing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/how-it-works", changeFrequency: "monthly", priority: 0.5 },
  { path: "/artwork-guide", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Latest product update per category drives each landing page's lastmod.
  const categoryUpdates = await db
    .select({ slug: categories.slug, updatedAt: max(products.updatedAt) })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(and(eq(products.isActive, true), eq(products.status, "ACTIVE")))
    .groupBy(categories.slug);
  const lastProductUpdate = new Map(categoryUpdates.map((row) => [row.slug, row.updatedAt]));

  return [
    ...staticPages.map((page) => ({
      url: `${SITE}${page.path}`,
      lastModified: STATIC_CONTENT_UPDATED,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...seoCategoryPages.map((page) => {
      const productUpdate = lastProductUpdate.get(page.category);
      const productDate = productUpdate ? new Date(productUpdate) : null;
      return {
        url: `${SITE}/${page.path}`,
        lastModified: productDate && productDate > STATIC_CONTENT_UPDATED ? productDate : STATIC_CONTENT_UPDATED,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      };
    }),
  ];
}
