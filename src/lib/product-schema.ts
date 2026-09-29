/**
 * Product structured data, built so it can never be invalid.
 *
 * Google only treats a Product as eligible when it carries `offers`, `review` or
 * `aggregateRating`. Rates on this site are shown to signed-in accounts only, so an
 * anonymous crawler has no price to attach. Emitting a price-less Product anyway is what
 * Search Console flagged as "Either 'offers', 'review' or 'aggregateRating' should be
 * specified" — every listed item was invalid.
 *
 * These helpers make the offer the precondition: no offer, no Product node. We do not
 * substitute review or aggregateRating, because inventing ratings to satisfy a validator
 * would be fabricated data and against Google's own guidelines.
 */

const SITE = "https://mahavircard.in";

export type ProductOffer = {
  "@type": "Offer";
  url: string;
  priceCurrency: string;
  price: string;
  availability: string;
  seller: { "@type": "Organization"; name: string };
  priceValidUntil?: string;
};

/** Returns an Offer only when there is a real price to publish; null otherwise. */
export function buildProductOffer(
  slug: string,
  startingPrice: number | null | undefined,
  options: { priceValidUntil?: string } = {},
): ProductOffer | null {
  if (typeof startingPrice !== "number" || !Number.isFinite(startingPrice) || startingPrice <= 0) return null;
  return {
    "@type": "Offer",
    url: `${SITE}/catalog/${slug}`,
    priceCurrency: "INR",
    price: startingPrice.toFixed(2),
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", name: "Mahavir Card" },
    ...(options.priceValidUntil ? { priceValidUntil: options.priceValidUntil } : {}),
  };
}

export type ListedProduct = {
  name: string;
  slug: string;
  imageUrl: string;
  specification: string;
  categoryName: string;
};

/**
 * One `itemListElement` entry. With an offer it is a full Product; without one it degrades
 * to a plain ListItem that still names and links the item, which stays valid.
 */
export function buildListItem(product: ListedProduct, position: number, offer: ProductOffer | null) {
  const url = `${SITE}/catalog/${product.slug}`;
  if (!offer) {
    return { "@type": "ListItem", position, name: product.name, url };
  }
  return {
    "@type": "ListItem",
    position,
    item: {
      "@type": "Product",
      name: product.name,
      url,
      image: `${SITE}${product.imageUrl}`,
      description: product.specification,
      sku: product.slug,
      category: product.categoryName,
      brand: { "@type": "Brand", name: "Mahavir Card" },
      offers: offer,
    },
  };
}

/** True when a node may legitimately be published as a schema.org Product. */
export function isValidProductNode(node: Record<string, unknown>): boolean {
  if (node["@type"] !== "Product") return true;
  return Boolean(node.offers || node.review || node.aggregateRating);
}
