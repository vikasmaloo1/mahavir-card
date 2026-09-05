import { and, asc, eq, inArray, or } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { db } from "@/lib/db/server";
import {
  artworkRequirements,
  artworkSlots,
  categories,
  customers,
  pricingRules,
  productAddons,
  productDeliveryRules,
  productImages,
  products,
  productVariants,
  searchLogs,
} from "@/lib/db/schema";
import { formatDimensions } from "@/lib/formatting";
import { getSession, requireRole } from "@/lib/permissions";
import { conciseProductSpecification, deriveStartingPriceMap } from "@/lib/product-listing-pricing";
import { productSchema } from "@/lib/validation";
import { resolveCategorySlug } from "@/lib/catalog-routing";
import { rankProducts, type ProductSearchCandidate, type SearchEngineResult } from "@/lib/search-engine";
import { evaluateStateAvailability } from "@/lib/state-availability";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    const authenticated = Boolean(session);
    const params = new URL(request.url).searchParams;
    const search = (params.get("search") ?? params.get("q"))?.trim();
    const requestedCategory = params.get("category")?.trim();
    const category = resolveCategorySlug(requestedCategory) ?? requestedCategory;
    const orderable = params.get("orderable");
    const quoteable = params.get("quoteable");
    const customerState = params.get("state")?.trim().toUpperCase();

    const conditions = [eq(products.isActive, true), eq(products.status, "ACTIVE")];
    if (category) conditions.push(eq(categories.slug, category));
    if (orderable === "true") conditions.push(eq(products.orderable, true));
    if (quoteable === "true") conditions.push(eq(products.quoteable, true));

    // 1. Fetch base active products matching category/orderable filters, concurrently with the
    // customer-type lookup (both are independent reads — no need to serialize them).
    const [baseRows, customerRows] = await Promise.all([
      db
        .select({ product: products, category: { name: categories.name, slug: categories.slug } })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(asc(products.sortOrder), asc(products.name)),
      session?.user?.id
        ? db.select({ customerType: customers.customerType }).from(customers).where(eq(customers.userId, session.user.id)).limit(1)
        : Promise.resolve([]),
    ]);
    const customerType: "B2C" | "B2B" = customerRows[0]?.customerType === "B2B" ? "B2B" : "B2C";

    let data = baseRows;
    let searchMeta: SearchEngineResult<unknown> | null = null;

    // 2. If search query is provided, execute Smart Fuzzy Ranking
    if (search) {
      const candidates: (ProductSearchCandidate & { originalRow: (typeof baseRows)[number] })[] = baseRows.map(
        (row) => ({
          id: row.product.id,
          name: row.product.name,
          slug: row.product.slug,
          description: row.product.description,
          shortDescription: row.product.shortDescription,
          productCode: row.product.productCode,
          category: row.category,
          listingSpecification: row.product.shortDescription,
          productSize: (row.product.configuration as { size?: string } | null)?.size ?? null,
          configuration: row.product.configuration as Record<string, unknown>,
          orderable: row.product.orderable,
          quoteable: row.product.quoteable,
          originalRow: row,
        })
      );

      const ranked = rankProducts(candidates, search);
      searchMeta = ranked;

      // Re-order data based on relevance rank
      data = ranked.results.map((r) => r.originalRow);

      // Asynchronously log search telemetry without blocking the response
      db.insert(searchLogs)
        .values({
          query: search,
          normalizedQuery: ranked.normalizedQuery,
          customerState: customerState || null,
          customerType: session?.user ? "AUTHENTICATED" : "GUEST",
          resultCount: ranked.total,
          confidence: ranked.confidence,
          matchedProductId: ranked.results[0]?.id || null,
          userId: session?.user?.id || null,
        })
        .catch(() => undefined);
    }

    const usesPagination = params.has("page") || params.has("limit");
    const limit = Math.min(Math.max(Number(params.get("limit")) || 12, 1), 300);
    const totalPages = Math.max(1, Math.ceil(data.length / limit));
    const page = Math.min(Math.max(Number(params.get("page")) || 1, 1), totalPages);
    const pageData = usesPagination ? data.slice((page - 1) * limit, page * limit) : data;
    const productIds = pageData.map(({ product }) => product.id);

    const [rules, addonRows, artworkRows, slotRows, imageRows, deliveryRows] = productIds.length
      ? await Promise.all([
          db
            .select({
              productId: pricingRules.productId,
              variantId: pricingRules.variantId,
              variantActive: productVariants.isActive,
              conditions: pricingRules.conditions,
              priceFormula: pricingRules.priceFormula,
              productionTime: pricingRules.productionTime,
              sortOrder: pricingRules.sortOrder,
              taxInclusive: pricingRules.taxInclusive,
              isActive: pricingRules.isActive,
            })
            .from(pricingRules)
            .leftJoin(productVariants, eq(pricingRules.variantId, productVariants.id))
            .where(and(inArray(pricingRules.productId, productIds), eq(pricingRules.isActive, true), or(eq(pricingRules.customerType, customerType), eq(pricingRules.customerType, "BOTH"))))
            .orderBy(asc(pricingRules.sortOrder)),
          db
            .select({ productId: productAddons.productId })
            .from(productAddons)
            .where(and(inArray(productAddons.productId, productIds), eq(productAddons.isActive, true))),
          db
            .select({
              id: artworkRequirements.id,
              productId: artworkRequirements.productId,
              pricingRuleId: artworkRequirements.pricingRuleId,
              artworkRequired: artworkRequirements.artworkRequired,
              acceptedFormats: artworkRequirements.acceptedFormats,
              designWidth: artworkRequirements.designWidth,
              designHeight: artworkRequirements.designHeight,
              designUnit: artworkRequirements.designUnit,
              safeAreaWidth: artworkRequirements.safeAreaWidth,
              safeAreaHeight: artworkRequirements.safeAreaHeight,
              finalWidth: artworkRequirements.finalWidth,
              finalHeight: artworkRequirements.finalHeight,
            })
            .from(artworkRequirements)
            .where(and(inArray(artworkRequirements.productId, productIds), eq(artworkRequirements.isActive, true)))
            .orderBy(asc(artworkRequirements.createdAt)),
          db
            .select({
              requirementId: artworkSlots.artworkRequirementId,
              productId: artworkRequirements.productId,
              name: artworkSlots.name,
              required: artworkSlots.required,
              sortOrder: artworkSlots.sortOrder,
            })
            .from(artworkSlots)
            .innerJoin(artworkRequirements, eq(artworkSlots.artworkRequirementId, artworkRequirements.id))
            .where(
              and(
                inArray(artworkRequirements.productId, productIds),
                eq(artworkRequirements.isActive, true),
                eq(artworkSlots.isActive, true)
              )
            )
            .orderBy(asc(artworkSlots.sortOrder)),
          db
            .select({
              productId: productImages.productId,
              imageUrl: productImages.imageUrl,
              isPrimary: productImages.isPrimary,
              sortOrder: productImages.sortOrder,
            })
            .from(productImages)
            .where(inArray(productImages.productId, productIds))
            .orderBy(asc(productImages.sortOrder)),
          db
            .select({
              productId: productDeliveryRules.productId,
              deliveryMethod: productDeliveryRules.deliveryMethod,
              stateCode: productDeliveryRules.stateCode,
              isActive: productDeliveryRules.isActive,
            })
            .from(productDeliveryRules)
            .where(and(inArray(productDeliveryRules.productId, productIds), eq(productDeliveryRules.isActive, true))),
        ])
      : [[], [], [], [], [], []];

    const startingPrices = authenticated
      ? deriveStartingPriceMap(
          pageData.map(({ product }) => product),
          rules
        )
      : new Map();
    const productAddonsMap = new Set(addonRows.map((row) => row.productId));
    const productionTimeMap = new Map<string, string>();
    for (const rule of rules) {
      if (rule.productionTime && !productionTimeMap.has(rule.productId)) {
        productionTimeMap.set(rule.productId, rule.productionTime);
      }
    }

    const primaryImageMap = new Map<string, string>();
    for (const img of imageRows) {
      if (img.isPrimary || !primaryImageMap.has(img.productId)) {
        primaryImageMap.set(img.productId, img.imageUrl);
      }
    }

    const items = pageData.map(({ product, category: categoryData }) => {
      const requirements = artworkRows.filter((row) => row.productId === product.id && row.artworkRequired);
      const requirement = requirements.find((row) => !row.pricingRuleId) ?? requirements[0];
      const requiredFiles = requirement
        ? slotRows.filter((row) => row.requirementId === requirement.id && row.required).map((row) => row.name)
        : [];
      const formats = requirement?.acceptedFormats?.map((format) => format.toUpperCase()) ?? [];
      const configuration = product.configuration as { size?: unknown } | null;
      const artworkSummary = requirement
        ? {
            formatLabel: formats.length === 1 ? `${formats[0]} only` : formats.join(" / "),
            fullDesign: formatDimensions(requirement.designWidth, requirement.designHeight, requirement.designUnit),
            safeArea: formatDimensions(requirement.safeAreaWidth, requirement.safeAreaHeight, requirement.designUnit),
            finalSize: formatDimensions(requirement.finalWidth, requirement.finalHeight, requirement.designUnit),
            requiredFiles,
          }
        : null;

      // Evaluate state availability for this product
      const productDelivRules = deliveryRows.filter((d) => d.productId === product.id);
      const stateAvailability = evaluateStateAvailability(product, productDelivRules, customerState);

      return {
        ...product,
        imageUrl: primaryImageMap.get(product.id) || product.imageUrl || null,
        category: categoryData,
        listingSpecification: conciseProductSpecification(product.name, product.shortDescription, categoryData?.name ?? null),
        productSize: typeof configuration?.size === "string" && configuration.size.trim() ? configuration.size.trim() : null,
        productionTime: product.productionTime || productionTimeMap.get(product.id) || null,
        ...(authenticated
          ? startingPrices.get(product.id)
          : { startingPrice: null, startingQuantity: null, currency: "INR", priceLabel: "Login to view price", priceState: "LOGIN", taxInclusive: null }),
        hasAddons: productAddonsMap.has(product.id),
        hasArtworkRequirement: Boolean(requirement),
        artworkSummary,
        stateAvailability,
      };
    });

    return jsonOk(
      usesPagination
        ? {
            items,
            pagination: { page, limit, total: data.length, totalPages },
            searchMeta: searchMeta
              ? {
                  query: searchMeta.query,
                  normalizedQuery: searchMeta.normalizedQuery,
                  confidence: searchMeta.confidence,
                  matchReason: searchMeta.matchReason,
                  fallbackQuoteAvailable: searchMeta.fallbackQuoteAvailable,
                  extractedRequirement: searchMeta.extractedRequirement,
                }
              : null,
          }
        : items
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const input = await readBody(request, productSchema);
    const [product] = await db.insert(products).values(input).returning();
    return product ? jsonOk(product, 201) : jsonError("Product was not created", 500);
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
