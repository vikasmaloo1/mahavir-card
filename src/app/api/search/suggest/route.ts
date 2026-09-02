import { and, asc, eq } from "drizzle-orm";

import { handleApiError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { categories, products } from "@/lib/db/schema";
import { rankProducts } from "@/lib/search-engine";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") ?? params.get("search"))?.trim();

    if (!query) {
      return jsonOk({
        query: "",
        confidence: "NONE",
        matchReason: "",
        suggestions: [],
        fallbackQuoteAvailable: false,
        extractedRequirement: {},
      });
    }

    // Fetch active products with categories
    const allProducts = await db
      .select({
        product: products,
        category: { name: categories.name, slug: categories.slug },
      })
      .from(products)
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(and(eq(products.isActive, true), eq(products.status, "ACTIVE")))
      .orderBy(asc(products.sortOrder), asc(products.name));

    const candidates = allProducts.map(({ product, category }) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      shortDescription: product.shortDescription,
      productCode: product.productCode,
      category,
      listingSpecification: product.shortDescription,
      productSize: (product.configuration as { size?: string } | null)?.size ?? null,
      imageUrl: product.imageUrl,
      orderable: product.orderable,
      quoteable: product.quoteable,
    }));

    const searchResult = rankProducts(candidates, query);

    const suggestions = searchResult.results.slice(0, 5).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category?.name ?? "Print Product",
      categorySlug: p.category?.slug ?? "products",
      imageUrl: p.imageUrl,
    }));

    return jsonOk({
      query: searchResult.query,
      normalizedQuery: searchResult.normalizedQuery,
      confidence: searchResult.confidence,
      matchReason: searchResult.matchReason,
      suggestions,
      total: searchResult.total,
      fallbackQuoteAvailable: searchResult.fallbackQuoteAvailable,
      extractedRequirement: searchResult.extractedRequirement,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
