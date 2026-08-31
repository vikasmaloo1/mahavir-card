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

  return (
    cat === "premium-card" ||
    cat === "art-card" ||
    cat === "premium-visiting-card" ||
    prod.startsWith("premium-") ||
    prod.startsWith("art-") ||
    prod.includes("velvet") ||
    prod.includes("spot-uv") ||
    prod.includes("drip-off")
  );
}

/**
 * Shared source of truth for quantity validation and normalization.
 * Standard products:
 *   - Min: 1000
 *   - Step: 1000
 *   - 1001 -> 2000, 1020 -> 2000, 1500 -> 2000, 1999 -> 2000
 *
 * Premium Card & Art Card special rule:
 *   - Allowed: 500, 1000, 2000, 3000, 4000...
 *   - 500 is allowed as a special first quantity.
 *   - 501 -> 1000, 700 -> 1000, 999 -> 1000, 1001 -> 2000, 1500 -> 2000
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
      step: 1000,
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
    // Greater than 500: normalize to next multiple of 1000 (e.g. 501..1000 -> 1000, 1001..2000 -> 2000)
    const normalized = Math.ceil(num / 1000) * 1000;
    return {
      normalizedQuantity: normalized,
      isValid: num === normalized,
      minimumQuantity: 500,
      step: 1000,
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
      if (normalizedQuantity < 500) return 500;
      if (normalizedQuantity === 500) return 1000;
      return normalizedQuantity + 1000;
    } else {
      if (normalizedQuantity <= 500) return 500;
      if (normalizedQuantity === 1000) return 500;
      return Math.max(500, normalizedQuantity - 1000);
    }
  }

  // Standard
  if (direction === "UP") {
    return Math.max(1000, normalizedQuantity + 1000);
  } else {
    return Math.max(1000, normalizedQuantity - 1000);
  }
}
