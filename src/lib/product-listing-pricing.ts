import { formatInr } from "@/lib/formatting";

export type ListingProduct = {
  id: string;
  orderable: boolean;
  quoteable: boolean;
  referenceQuantity: number | null;
  pricesTaxInclusive: boolean;
};

export type ListingPricingRule = {
  productId: string;
  variantId?: string | null;
  variantActive?: boolean | null;
  conditions: Record<string, unknown>;
  priceFormula: Record<string, unknown>;
  taxInclusive: boolean;
  isActive: boolean;
};

export type StartingPrice = {
  startingPrice: number | null;
  startingQuantity: number | null;
  currency: "INR";
  priceLabel: string;
  priceState: "STARTING" | "CUSTOM_QUOTE" | "CONTACT";
  taxInclusive: boolean | null;
};

function positiveNumber(value: unknown) {
  const number = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

function positiveInteger(value: unknown) {
  const number = positiveNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function isCustomerVisible(rule: ListingPricingRule) {
  const visibility = String(rule.conditions.visibility ?? rule.priceFormula.visibility ?? "PUBLIC").toUpperCase();
  return rule.isActive
    && (!rule.variantId || rule.variantActive === true)
    && rule.conditions.customerVisible !== false
    && rule.priceFormula.customerVisible !== false
    && rule.conditions.internalOnly !== true
    && rule.priceFormula.internalOnly !== true
    && visibility !== "INTERNAL"
    && visibility !== "ADMIN";
}

export function deriveStartingPrice(product: ListingProduct, rules: ListingPricingRule[]): StartingPrice {
  const fallback: StartingPrice = product.quoteable
    ? { startingPrice: null, startingQuantity: null, currency: "INR", priceLabel: "Custom quote", priceState: "CUSTOM_QUOTE", taxInclusive: null }
    : { startingPrice: null, startingQuantity: null, currency: "INR", priceLabel: "Contact us for pricing", priceState: "CONTACT", taxInclusive: null };

  if (!product.orderable) return fallback;

  const candidates = rules.filter((rule) => rule.productId === product.id && isCustomerVisible(rule)).flatMap((rule) => {
    const amount = positiveNumber(rule.priceFormula.amount);
    const rate = positiveNumber(rule.priceFormula.ratePerSqInch);
    const ratePaise = positiveNumber(rule.priceFormula.ratePaisePerSqInch);
    if (amount === null && rate === null) return [];
    if (amount === null && rate !== null) {
      return [{
        amount: rate,
        quantity: null,
        label: ratePaise !== null ? `${ratePaise.toLocaleString("en-IN")} paise / sq.in` : `${formatInr(rate)} / sq.in`,
        taxInclusive: rule.taxInclusive,
      }];
    }
    if (amount !== null) {
      const quantity = positiveInteger(rule.conditions.quantity) ?? positiveInteger(product.referenceQuantity);
      const unit = String(rule.priceFormula.unit ?? "batch").toLowerCase();
      if (unit !== "batch" && unit !== "piece") return [];
      if (unit === "piece" && quantity === null) return [];
      const displayAmount = unit === "piece" ? amount * quantity! : amount;
      return Number.isFinite(displayAmount) && displayAmount > 0 ? [{ amount: displayAmount, quantity, label: `Base price ${formatInr(displayAmount)}${quantity ? ` / ${quantity.toLocaleString("en-IN")}` : ""}`, taxInclusive: rule.taxInclusive }] : [];
    }
    return [];
  });

  const lowest = candidates.sort((a, b) => a.amount - b.amount || (a.quantity ?? Number.MAX_SAFE_INTEGER) - (b.quantity ?? Number.MAX_SAFE_INTEGER))[0];
  if (!lowest) return fallback;

  return {
    startingPrice: lowest.amount,
    startingQuantity: lowest.quantity,
    currency: "INR",
    priceLabel: lowest.label,
    priceState: "STARTING",
    taxInclusive: lowest.taxInclusive,
  };
}

export function conciseProductSpecification(name: string, description: string | null, categoryName: string | null) {
  let summary = description?.trim() ?? "";
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedCategory = categoryName?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  summary = summary
    .replace(new RegExp(`^${escapedName}\\s*(?:[-:|\u00b7]\\s*)?`, "i"), "")
    .replace(new RegExp(`^${escapedCategory ? `${escapedCategory}\\s*(?:[-:|\u00b7]\\s*)?` : "(?!)"}`, "i"), "")
    .replace(/\s*for (?:a )?reference batch of [\d,]+(?:\s+(?:cards|pieces|pcs|units))?\.?/gi, "")
    .replace(/\s*reference quantity:\s*[\d,]+\.?/gi, "")
    .replace(/\btearable\s*(?:[\u00b7\-|]\s*)?/gi, "")
    .trim()
    .replace(/^[,.;:\-\u00b7\s]+|[,;:\-\u00b7\s]+$/g, "");

  if (summary) return summary.charAt(0).toUpperCase() + summary.slice(1);

  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("thermal matt") && (normalizedName.includes("single") || normalizedName.includes("uv"))) {
    return "Single / Front Back Printing";
  }
  const subject = categoryName?.toLowerCase().includes("card") ? "visiting card" : "print job";
  if ((normalizedName.includes("single") && (normalizedName.includes("front") || normalizedName.includes("back") || normalizedName.includes("both"))) || /single\s*(?:\/|\+)\s*front/i.test(normalizedName)) {
    return "Single / Front Back Printing";
  }
  if (/front[\s-]*back|both[\s-]*side|f[\s-]*b/.test(normalizedName)) return `Front-and-back ${subject} printing.`;
  if (/single[\s-]*side|\bsingle\b/.test(normalizedName)) return `Single-side ${subject} printing.`;
  return categoryName ? `${categoryName} specification.` : "Production-ready print specification.";
}

export function deriveStartingPriceMap(products: ListingProduct[], rules: ListingPricingRule[]) {
  const rulesByProduct = new Map<string, ListingPricingRule[]>();
  for (const rule of rules) rulesByProduct.set(rule.productId, [...(rulesByProduct.get(rule.productId) ?? []), rule]);
  return new Map(products.map((product) => [product.id, deriveStartingPrice(product, rulesByProduct.get(product.id) ?? [])]));
}
