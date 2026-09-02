export const catalogCategories = [
  { slug: "visiting-card", name: "Visiting Card", aliases: ["business-cards", "business-card", "visiting-cards"] },
  { slug: "premium-card", name: "Premium Card", aliases: ["premium-cards"] },
  { slug: "art-card", name: "Art Card", aliases: ["art-cards"] },
  { slug: "letterhead-envelope", name: "Letterhead / Envelope", aliases: ["letterhead", "letterheads", "envelope", "envelopes"] },
  { slug: "brochure", name: "Brochure", aliases: ["brochures"] },
  { slug: "leaflet-cover", name: "Leaflet", aliases: ["leaflet", "leaflets", "leaflet-cover", "cover", "covers"] },
  { slug: "sticker", name: "Sticker", aliases: ["stickers", "labels-stickers"] },
] as const;

export type CanonicalCategorySlug = (typeof catalogCategories)[number]["slug"];

const categoryAliases = new Map<string, CanonicalCategorySlug>(
  catalogCategories.flatMap((category) => [
    [category.slug, category.slug] as const,
    ...category.aliases.map((alias) => [alias, category.slug] as const),
  ]),
);

export type ProductFilters = {
  category: string;
  search: string;
  orderable: boolean;
  quoteable?: boolean;
  page: number;
};

type SearchParamsReader = Pick<URLSearchParams, "get">;

export function resolveCategorySlug(value: string | null | undefined): CanonicalCategorySlug | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? categoryAliases.get(normalized) ?? null : null;
}

export function isLegacyCategorySlug(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  const resolved = resolveCategorySlug(normalized);
  return Boolean(normalized && resolved && normalized !== resolved);
}

export function readProductFilters(params: SearchParamsReader): ProductFilters {
  const requestedCategory = params.get("category")?.trim() ?? "";
  const resolvedCategory = resolveCategorySlug(requestedCategory);
  const page = Number.parseInt(params.get("page") ?? "1", 10);

  return {
    category: resolvedCategory ?? requestedCategory,
    search: (params.get("search") ?? params.get("q") ?? "").trim(),
    orderable: params.get("orderable") === "true",
    quoteable: params.get("quoteable") === "true",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function productFiltersToSearchParams(filters: ProductFilters) {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", resolveCategorySlug(filters.category) ?? filters.category);
  if (filters.search) params.set("search", filters.search.trim());
  if (filters.orderable) params.set("orderable", "true");
  if (filters.quoteable) params.set("quoteable", "true");
  if (filters.page > 1) params.set("page", String(filters.page));
  return params;
}

export function productListingHref(filters: ProductFilters) {
  const query = productFiltersToSearchParams(filters).toString();
  return query ? `/products?${query}` : "/products";
}

export function safeProductReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/products") || value.startsWith("//")) return "/products";
  try {
    const url = new URL(value, "https://mahavircard.local");
    return url.origin === "https://mahavircard.local" && url.pathname === "/products" ? `${url.pathname}${url.search}` : "/products";
  } catch {
    return "/products";
  }
}
