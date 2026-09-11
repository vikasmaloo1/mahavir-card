export const MAX_ORDER_QUANTITY = 25000;

export type QuantityNormalizationResult = {
  normalizedQuantity: number;
  isValid: boolean;
  isNegativeOrZero: boolean;
  isAboveMax: boolean;
  minimumQuantity: number;
  maximumQuantity: number;
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
 *   - Max: 25,000 (above 25,000 requires quotation)
 *
 * Premium Card special rule (except 400 GSM Drip-Off):
 *   - Min: 500
 *   - Step: 500
 *   - Max: 25,000 (above 25,000 requires quotation)
 */
export function normalizeProductQuantity(
  input: number | string | null | undefined,
  categorySlug?: string | null,
  productSlug?: string | null
): QuantityNormalizationResult {
  const isSpecial = isSpecialQuantityProduct(categorySlug, productSlug);
  const minQty = isSpecial ? 500 : 1000;
  const step = isSpecial ? 500 : 1000;
  const num = typeof input === "string" ? parseInt(input.replace(/[^0-9-]/g, ""), 10) : Number(input);

  if (isNaN(num) || num <= 0) {
    return {
      normalizedQuantity: minQty,
      isValid: false,
      isNegativeOrZero: true,
      isAboveMax: false,
      minimumQuantity: minQty,
      maximumQuantity: MAX_ORDER_QUANTITY,
      step,
      message: `Quantity must be positive and at least ${minQty.toLocaleString("en-IN")}.`,
    };
  }

  if (num > MAX_ORDER_QUANTITY) {
    return {
      normalizedQuantity: MAX_ORDER_QUANTITY,
      isValid: false,
      isNegativeOrZero: false,
      isAboveMax: true,
      minimumQuantity: minQty,
      maximumQuantity: MAX_ORDER_QUANTITY,
      step,
      message: `Direct online ordering is capped at ${MAX_ORDER_QUANTITY.toLocaleString("en-IN")} units. For higher quantities, please request a quotation.`,
    };
  }

  if (isSpecial) {
    if (num <= 500) {
      return {
        normalizedQuantity: 500,
        isValid: num === 500,
        isNegativeOrZero: false,
        isAboveMax: false,
        minimumQuantity: 500,
        maximumQuantity: MAX_ORDER_QUANTITY,
        step: 500,
      };
    }
    // Increments of 500 (500, 1000, 1500, 2000, 2500... up to 25,000)
    const normalized = Math.min(MAX_ORDER_QUANTITY, Math.ceil(num / 500) * 500);
    return {
      normalizedQuantity: normalized,
      isValid: num === normalized,
      isNegativeOrZero: false,
      isAboveMax: false,
      minimumQuantity: 500,
      maximumQuantity: MAX_ORDER_QUANTITY,
      step: 500,
    };
  }

  // Standard product: blocks of 1000 up to 25,000
  if (num <= 1000) {
    return {
      normalizedQuantity: 1000,
      isValid: num === 1000,
      isNegativeOrZero: false,
      isAboveMax: false,
      minimumQuantity: 1000,
      maximumQuantity: MAX_ORDER_QUANTITY,
      step: 1000,
    };
  }

  const normalized = Math.min(MAX_ORDER_QUANTITY, Math.ceil(num / 1000) * 1000);
  return {
    normalizedQuantity: normalized,
    isValid: num === normalized,
    isNegativeOrZero: false,
    isAboveMax: false,
    minimumQuantity: 1000,
    maximumQuantity: MAX_ORDER_QUANTITY,
    step: 1000,
  };
}

/**
 * Step quantity up or down according to category rules.
 * Never allows stepping below minQty or above MAX_ORDER_QUANTITY (25,000).
 */
export function stepProductQuantity(
  current: number | string | null | undefined,
  direction: "UP" | "DOWN",
  categorySlug?: string | null,
  productSlug?: string | null
): number {
  const isSpecial = isSpecialQuantityProduct(categorySlug, productSlug);
  const step = isSpecial ? 500 : 1000;
  const minQty = isSpecial ? 500 : 1000;
  const { normalizedQuantity } = normalizeProductQuantity(current, categorySlug, productSlug);

  if (direction === "UP") {
    return Math.min(MAX_ORDER_QUANTITY, normalizedQuantity + step);
  } else {
    return Math.max(minQty, normalizedQuantity - step);
  }
}
