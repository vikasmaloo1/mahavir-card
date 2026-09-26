/**
 * Catalogue price modes and the display model derived from them.
 *
 * Client-safe on purpose (no server-only imports): the browser catalogue, the PDF export
 * and the tests all build price text through these functions, so none of them can drift.
 */

export type CatalogPriceMode = "RETAIL" | "B2B" | "SHOWROOM";

export const CATALOG_PRICE_MODES: readonly CatalogPriceMode[] = ["RETAIL", "B2B", "SHOWROOM"] as const;

export function isCatalogPriceMode(value: unknown): value is CatalogPriceMode {
  return typeof value === "string" && (CATALOG_PRICE_MODES as readonly string[]).includes(value);
}

export const CATALOG_MODE_LABELS: Record<CatalogPriceMode, string> = {
  RETAIL: "Standard Retail Rates",
  B2B: "Trade Wholesale Rates",
  SHOWROOM: "Showroom Display · Enquire for Pricing",
};

/** Short label for the mode switcher in the browser UI. */
export const CATALOG_MODE_SHORT_LABELS: Record<CatalogPriceMode, string> = {
  RETAIL: "Standard Retail",
  B2B: "Trade Wholesale",
  SHOWROOM: "Showroom Display",
};

/**
 * One segment's rate, read straight from that segment's active pricing rule in the database.
 * Retail rules are tax-exclusive (18% GST added on top); trade rules are tax-inclusive at 0%.
 */
export type CatalogRate = {
  ruleType: "FIXED" | "FIXED_PER_REFERENCE_QUANTITY" | "PER_SQ_INCH";
  amount: number | null;
  ratePerSqInch: number | null;
  rateUnit: "RUPEES" | "PAISE";
  referenceQuantity: number;
  bladeCharge: number | null;
  minimumCharge: number | null;
  taxInclusive: boolean;
  taxRatePercent: number;
};

/** The subset of a catalogue product needed to derive display pricing. */
export type PricedProduct = {
  /** B2C rate, or null when the product has no retail rule. */
  retail: CatalogRate | null;
  /** B2B rate, or null when the product has no trade rule. */
  trade: CatalogRate | null;
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
  /** GST wording. Retail rates exclude GST and say so; trade rates are inclusive and say nothing. */
  taxNote: string | null;
  /** Minimum billing note for area-priced jobs. */
  minimumNote: string | null;
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

function rateText(rate: number, unit: "RUPEES" | "PAISE") {
  return unit === "PAISE" ? `${rate} paise / sq.in` : `Rs ${rate} / sq.in`;
}

/**
 * GST wording for a rate. Retail rules are stored tax-exclusive at 18%, so the catalogue
 * must say the tax is added; trade rules are stored tax-inclusive at 0%, so they say nothing.
 */
function taxNoteFor(rate: CatalogRate): string | null {
  if (rate.taxInclusive || rate.taxRatePercent <= 0) return null;
  const percent = Number.isInteger(rate.taxRatePercent) ? rate.taxRatePercent : Number(rate.taxRatePercent.toFixed(2));
  return `+ ${percent}% GST applicable`;
}

function batchLabelFor(ruleType: string, referenceQuantity: number) {
  return ruleType === "PER_SQ_INCH"
    ? "Custom sq.inch area"
    : `${referenceQuantity.toLocaleString("en-IN")} pcs batch`;
}

export function buildPriceView(product: PricedProduct, mode: CatalogPriceMode): CatalogPriceView {
  // Showroom returns before any monetary field is read, so no price can reach the renderer.
  // Only the rule type and batch size are consulted, and neither is a price.
  if (mode === "SHOWROOM") {
    const shape = product.retail ?? product.trade;
    return {
      batchLabel: shape ? batchLabelFor(shape.ruleType, shape.referenceQuantity) : "Made to order",
      primary: null,
      primaryLabel: null,
      taxNote: null,
      minimumNote: null,
      enquiryNote: "Showroom display - enquire for pricing",
      bladeNote: shape?.bladeCharge ? "Half blade supported" : null,
    };
  }

  const rate = mode === "B2B" ? product.trade : product.retail;
  if (!rate) {
    return {
      batchLabel: "Made to order",
      primary: null,
      primaryLabel: null,
      taxNote: null,
      minimumNote: null,
      enquiryNote: "Rate on request",
      bladeNote: null,
    };
  }

  const isPerSqInch = rate.ruleType === "PER_SQ_INCH";
  const primary = isPerSqInch
    ? rate.ratePerSqInch !== null
      ? rateText(rate.ratePerSqInch, rate.rateUnit)
      : null
    : rate.amount !== null
      ? inr(rate.amount)
      : null;

  return {
    batchLabel: batchLabelFor(rate.ruleType, rate.referenceQuantity),
    primary,
    primaryLabel: mode === "B2B" ? "Trade wholesale" : "Standard retail",
    taxNote: primary ? taxNoteFor(rate) : null,
    minimumNote: rate.minimumCharge ? `Minimum billing ${inr(rate.minimumCharge)}` : null,
    enquiryNote: primary ? null : "Rate on request",
    bladeNote: rate.bladeCharge ? `Half blade: ${inr(rate.bladeCharge)}` : null,
  };
}

/**
 * Narrows a requested mode to one the viewer is actually allowed to see. This is the check
 * that stops a retail account fetching the trade edition by editing the query string, so it
 * falls back to the viewer's default rather than honouring anything unrecognised.
 */
export function resolveCatalogMode(
  allowedModes: readonly CatalogPriceMode[],
  defaultMode: CatalogPriceMode,
  requested: string | null | undefined,
): CatalogPriceMode {
  if (!allowedModes.length) return defaultMode;
  const safeDefault = allowedModes.includes(defaultMode) ? defaultMode : allowedModes[0];
  if (typeof requested !== "string") return safeDefault;
  return (allowedModes as readonly string[]).includes(requested) ? (requested as CatalogPriceMode) : safeDefault;
}
