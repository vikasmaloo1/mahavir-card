import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categories, designTemplates, products } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const categorySlug = new URL(request.url).searchParams.get("category");
    const conditions = [eq(designTemplates.isActive, true)];
    if (categorySlug) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categorySlug)).limit(1);
      if (!category) return jsonOk({ items: [] });
      conditions.push(eq(designTemplates.categoryId, category.id));
    }

    const rows = await db
      .select({
        id: designTemplates.id,
        title: designTemplates.title,
        description: designTemplates.description,
        imageUrl: designTemplates.imageUrl,
        hasSourceFile: designTemplates.sourceFileStorageKey,
        category: { name: categories.name, slug: categories.slug },
        product: { slug: products.slug, name: products.name, orderable: products.orderable },
      })
      .from(designTemplates)
      .leftJoin(categories, eq(designTemplates.categoryId, categories.id))
      .leftJoin(products, eq(designTemplates.productId, products.id))
      .where(and(...conditions))
      .orderBy(asc(designTemplates.sortOrder));

    return jsonOk({
      items: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        imageUrl: row.imageUrl ? `/api/design-templates/${row.id}/image/file` : null,
        hasSourceFile: Boolean(row.hasSourceFile),
        category: row.category?.slug ? row.category : null,
        product: row.product?.slug && row.product.orderable ? row.product : null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
