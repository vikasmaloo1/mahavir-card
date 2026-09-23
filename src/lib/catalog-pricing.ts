export type CatalogPriceMode = "RANGE" | "RETAIL" | "B2B" | "SHOWROOM";

export const CATALOG_PRICE_MODES: readonly CatalogPriceMode[] = ["RANGE", "RETAIL", "B2B", "SHOWROOM"] as const;

export function isCatalogPriceMode(value: unknown): value is CatalogPriceMode {
  return typeof value === "string" && (CATALOG_PRICE_MODES as readonly string[]).includes(value);
}

export const CATALOG_MODE_LABELS: Record<CatalogPriceMode, string> = {
  RANGE: "All Rates · Trade & Retail Range",
  RETAIL: "Standard Retail Rates",
  B2B: "Trade Wholesale Rates",
  SHOWROOM: "Showroom Display · Enquire for Pricing",
};

/** The subset of a product needed to derive display pricing. */
export type PricedProduct = {
  ruleType: "FIXED_PER_REFERENCE_QUANTITY" | "FIXED" | "PER_SQ_INCH";
  amount?: number;
  ratePerSqInch?: number;
  rateUnit?: "RUPEES" | "PAISE";
  b2bAmount?: number;
  b2bRatePerSqInch?: number;
  referenceQuantity?: number;
  bladeCharge?: number;
};

/**
 * What a catalogue row may show for a product in a given mode.
 *
 * In SHOWROOM mode every price-bearing field is `null` by construction — the renderer has
 * nothing to print even by mistake, rather than relying on a styling rule to hide it.
 */
export type CatalogPriceView = {
  /** Non-price batch/area context, safe in every mode. */
  batchLabel: string;
  /** Headline price string, or null when the mode carries no pricing. */
  primary: string | null;
  primaryLabel: string | null;
  /** Secondary breakdown rows (trade / retail), empty when the mode carries no pricing. */
  breakdown: Array<{ label: string; value: string }>;
  /** Call-to-action shown in place of a price. */
  enquiryNote: string | null;
  /** Blade surcharge text; drops the amount in showroom mode. */
  bladeNote: string | null;
};

/**
 * Strips monetary amounts out of free text. Some catalogue descriptions embed a figure
 * ("Square-inch pricing - minimum charge ₹250"), which would otherwise leak a real price
 * into the showroom edition even though its price panel is empty.
 */
export function stripPriceText(text: string): string {
  return text
    .replace(/(?:[-·|,]\s*)?\b(?:minimum|min\.?)\s+(?:charge|order|billing)\b[^.·|]*/gi, "")
    .replace(/(?:₹|\bRs\.?\s*|\bINR\s*)\s?[\d,]+(?:\.\d+)?/gi, "")
    .replace(/\b[\d,]+(?:\.\d+)?\s*(?:rupees|paise)\b/gi, "")
    .replace(/\s*[-·|,]\s*(?=[-·|,]|$)/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .replace(/[\s·|,-]+$/, "")
    .trim();
}

function inr(value: number) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function rateText(rate: number, unit: "RUPEES" | "PAISE" | undefined) {
  return unit === "PAISE" ? `${rate} paise / sq.in` : `Rs ${rate} / sq.in`;
}

export function buildPriceView(product: PricedProduct, mode: CatalogPriceMode): CatalogPriceView {
  const isPerSqInch = product.ruleType === "PER_SQ_INCH";
  const qty = product.referenceQuantity || 1000;
  const batchLabel = isPerSqInch ? "Custom sq.inch area" : `${qty.toLocaleString("en-IN")} pcs batch`;

  // Showroom: return before any monetary value is read, so no price can reach the renderer.
  if (mode === "SHOWROOM") {
    return {
      batchLabel,
      primary: null,
      primaryLabel: null,
      breakdown: [],
      enquiryNote: "Showroom display - enquire for pricing",
      bladeNote: product.bladeCharge ? "Half blade supported" : null,
    };
  }

  const retailRate = product.ratePerSqInch ?? 0;
  const tradeRate = product.b2bRatePerSqInch ?? retailRate;
  const retailAmount = product.amount ?? 0;
  const tradeAmount = product.b2bAmount ?? retailAmount;
  const bladeNote = product.bladeCharge ? `Half blade: ${inr(product.bladeCharge)}` : null;

  if (mode === "B2B") {
    return {
      batchLabel,
      primary: isPerSqInch ? rateText(tradeRate, product.rateUnit) : inr(tradeAmount),
      primaryLabel: "Trade wholesale",
      breakdown: [],
      enquiryNote: null,
      bladeNote,
    };
  }

  if (mode === "RETAIL") {
    return {
      batchLabel,
      primary: isPerSqInch ? rateText(retailRate, product.rateUnit) : inr(retailAmount),
      primaryLabel: "Standard retail",
      breakdown: [],
      enquiryNote: null,
      bladeNote,
    };
  }

  // RANGE: trade-to-retail span plus the two individual rates.
  const minRate = Math.min(retailRate, tradeRate);
  const maxRate = Math.max(retailRate, tradeRate);
  const minAmount = Math.min(retailAmount, tradeAmount);
  const maxAmount = Math.max(retailAmount, tradeAmount);

  const primary = isPerSqInch
    ? minRate === maxRate
      ? rateText(minRate, product.rateUnit)
      : `${minRate} - ${maxRate} ${product.rateUnit === "PAISE" ? "paise" : "Rs"} / sq.in`
    : minAmount === maxAmount
      ? inr(minAmount)
      : `${inr(minAmount)} - ${inr(maxAmount)}`;

  return {
    batchLabel,
    primary,
    primaryLabel: "Price range",
    breakdown: [
      { label: "Trade", value: isPerSqInch ? rateText(tradeRate, product.rateUnit) : inr(tradeAmount) },
      { label: "Retail", value: isPerSqInch ? rateText(retailRate, product.rateUnit) : inr(retailAmount) },
    ],
    enquiryNote: null,
    bladeNote,
  };
}
