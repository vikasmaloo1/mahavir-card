export type QuantityNormalizationResult = {
  normalizedQuantity: number;
  isValid: boolean;
  minimumQuantity: number;
  step: number;
  message?: string;
};

export function isSpecialQuantityProduct(categorySlug?: string | null, productSlug?: string | null): boolean {
  if (!categorySlug && !productSlug) return false;
  const cat = (categorySlug || "").toLowerCase().trim();
  const prod = (productSlug || "").toLowerCase().trim();

  // The Drip-Off Premium Card is 1000 quantity
  if (prod === "premium-400-gsm-dripoff-front-back" || prod.includes("drip-off") || prod.includes("dripoff")) return false;

  // Premium Cards (except drip-off) are 500 quantity with 500 increment
  return (
    cat === "premium-card" ||
    cat === "premium-visiting-card" ||
    prod.startsWith("premium-") ||
    prod.includes("velvet") ||
    prod.includes("spot-uv")
  );
}

/**
 * Shared source of truth for quantity validation and normalization.
 * Standard products (including Art Card, Visiting Card, etc.):
 *   - Min: 1000
 *   - Step: 1000
 *   - 1001 -> 2000, 1020 -> 2000, 1500 -> 2000, 1999 -> 2000
 *
 * Premium Card special rule (except 400 GSM Drip-Off):
 *   - Min: 500
 *   - Step: 500
 *   - Allowed: 500, 1000, 1500, 2000, 2500...
 */
export function normalizeProductQuantity(
  input: number | string | null | undefined,
  categorySlug?: string | null,
  productSlug?: string | null
): QuantityNormalizationResult {
  const isSpecial = isSpecialQuantityProduct(categorySlug, productSlug);
  const minQty = isSpecial ? 500 : 1000;
  const num = typeof input === "string" ? parseInt(input.replace(/[^0-9]/g, ""), 10) : Number(input);

  if (isNaN(num) || num <= 0) {
    return {
      normalizedQuantity: minQty,
      isValid: false,
      minimumQuantity: minQty,
      step: minQty,
      message: `Quantity must be at least ${minQty.toLocaleString("en-IN")}.`,
    };
  }

  if (isSpecial) {
    if (num <= 500) {
      return {
        normalizedQuantity: 500,
        isValid: num === 500,
        minimumQuantity: 500,
        step: 500,
      };
    }
    // Increments of 500 (500, 1000, 1500, 2000, 2500...)
    const normalized = Math.ceil(num / 500) * 500;
    return {
      normalizedQuantity: normalized,
      isValid: num === normalized,
      minimumQuantity: 500,
      step: 500,
    };
  }

  // Standard product: blocks of 1000
  if (num <= 1000) {
    return {
      normalizedQuantity: 1000,
      isValid: num === 1000,
      minimumQuantity: 1000,
      step: 1000,
    };
  }

  const normalized = Math.ceil(num / 1000) * 1000;
  return {
    normalizedQuantity: normalized,
    isValid: num === normalized,
    minimumQuantity: 1000,
    step: 1000,
  };
}

/**
 * Step quantity up or down according to category rules.
 */
export function stepProductQuantity(
  current: number | string | null | undefined,
  direction: "UP" | "DOWN",
  categorySlug?: string | null,
  productSlug?: string | null
): number {
  const isSpecial = isSpecialQuantityProduct(categorySlug, productSlug);
  const { normalizedQuantity } = normalizeProductQuantity(current, categorySlug, productSlug);

  if (isSpecial) {
    if (direction === "UP") {
      return Math.max(500, normalizedQuantity + 500);
    } else {
      return Math.max(500, normalizedQuantity - 500);
    }
  }

  // Standard
  if (direction === "UP") {
    return Math.max(1000, normalizedQuantity + 1000);
  } else {
    return Math.max(1000, normalizedQuantity - 1000);
  }
}
