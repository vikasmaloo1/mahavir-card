import "server-only";

import { and, asc, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { addons, customers, locationSurcharges, pricingRules, productAddons, productDeliveryRules, products, productVariants } from "@/lib/db/schema";
import { normalizedCity } from "@/lib/india-states";

type RuleData = { quantity?: number; specification?: string; [key: string]: unknown };
type FormulaData = { amount?: string; unit?: "batch" | "piece" | "reference_batch_area"; ratePerSqInch?: number; minimumArea?: number | null; minimumCharge?: number | null; bladeCharge?: number | null; [key: string]: unknown };

export type DeliverySelection = { method: "PICKUP" | "LOCAL_DELIVERY" | "COURIER"; stateCode?: string };
export type PriceCalculationInput = { addonIds?: string[]; delivery?: DeliverySelection; userId?: string };

export type CalculatedPrice = {
  calculatedAmount: string | null;
  productPrice: string | null;
  addonTotal: string;
  addons: Array<{ addonId: string; name: string; price: string; pricingType: string }>;
  delivery: { method: string | null; stateCode: string | null; price: string };
  locationSurcharge: { amount: string; label: string | null };
  taxInclusive: boolean;
  taxAmount: string;
  priceBeforeTax: string | null;
  taxRate: string | null;
  currency: "INR";
  pricingDetails: Record<string, unknown>;
  applicableRule: string | null;
  applicableRuleId: string | null;
  warnings: string[];
};

export class PricingValidationError extends Error {}

function money(value: number) { return value.toFixed(2); }

function positive(value: unknown, label: string) {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0) throw new PricingValidationError(`${label} must be greater than zero`);
  return result;
}

async function calculateBasePrice(productId: string, quantity: number, options: Record<string, unknown>) {
  const rules = await db.select().from(pricingRules).where(and(eq(pricingRules.productId, productId), eq(pricingRules.isActive, true))).orderBy(asc(pricingRules.createdAt));
  const requestedRuleId = typeof options.pricingRuleId === "string" ? options.pricingRuleId : undefined;
  const matching = rules.map((rule) => ({ rule, conditions: rule.conditions as RuleData, formula: rule.priceFormula as FormulaData })).filter(({ rule, conditions }) => requestedRuleId ? rule.id === requestedRuleId : (!conditions.specification || conditions.specification === options.specification)).sort((a, b) => Math.abs((a.conditions.quantity ?? quantity) - quantity) - Math.abs((b.conditions.quantity ?? quantity) - quantity));
  const selected = matching[0];
  if (selected?.rule.ruleType === "PER_SQ_INCH") {
    const width = positive(options.width, "Width");
    const height = positive(options.height, "Height");
    const area = width * height;
    const rate = positive(selected.formula.ratePerSqInch, "Square-inch rate");
    const minimumArea = Number(selected.formula.minimumArea || 0);
    if (minimumArea > 0 && area < minimumArea) throw new PricingValidationError(`This configuration requires at least ${minimumArea} square inches`);
    const minimumCharge = Number(selected.formula.minimumCharge || 0);
    const bladeCharge = Number(selected.formula.bladeCharge || 0);
    const bladeCount = Number(options.bladeCount || 0);
    if (!Number.isInteger(bladeCount) || bladeCount < 0) throw new PricingValidationError("Blade count must be a whole number");
    const areaPrice = Math.max(area * rate, minimumCharge);
    const extraCharge = bladeCount * bladeCharge;
    const expectedQuantity = selected.conditions.quantity;
    return {
      amount: areaPrice + extraCharge, rule: selected.rule.name, ruleId: selected.rule.id,
      taxInclusive: selected.rule.taxInclusive, taxRate: selected.rule.taxRate ? Number(selected.rule.taxRate) : null,
      details: { quantity, width, height, area, ratePerSqInch: rate, minimumArea: minimumArea || null, minimumCharge: minimumCharge || null, bladeCount, bladeCharge: bladeCharge || null, extraCharge, source: "RATE.xlsx", unit: "reference_batch_area" },
      warnings: expectedQuantity && expectedQuantity !== quantity ? [`This rate is configured for ${expectedQuantity.toLocaleString("en-IN")} quantity.`] : [],
    };
  }
  if (selected?.formula.amount) {
    const amount = Number(selected.formula.amount);
    const base = selected.formula.unit === "piece" ? amount * quantity : amount;
    const expectedQuantity = selected.conditions.quantity;
    return { amount: base, rule: selected.rule.name, ruleId: selected.rule.id, taxInclusive: selected.rule.taxInclusive, taxRate: selected.rule.taxRate ? Number(selected.rule.taxRate) : null, details: { quantity, specification: selected.conditions.specification ?? null, source: selected.formula.source ?? "RATE.xlsx", sourceNetAmount: selected.formula.sourceNetAmount ?? null, unit: selected.formula.unit ?? "batch" }, warnings: expectedQuantity && expectedQuantity !== quantity ? [`This rate is configured for ${expectedQuantity.toLocaleString("en-IN")} quantity.`] : [] };
  }
  const [variant] = await db.select().from(productVariants).where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true))).orderBy(asc(productVariants.basePrice)).limit(1);
  if (!variant || Number(variant.basePrice) <= 0) return { amount: null, rule: null, ruleId: null, taxInclusive: true, taxRate: null, details: {}, warnings: ["This product needs a custom quote."] };
  return { amount: Number(variant.basePrice) * quantity, rule: variant.name, ruleId: null, taxInclusive: true, taxRate: null, details: { quantity, source: "BASE_VARIANT" }, warnings: [] };
}

async function locationCharge(productId: string, ruleId: string | null, userId?: string) {
  if (!userId) return { amount: 0, label: null as string | null, taxInclusive: true };
  const [customer] = await db.select({ city: customers.city, stateCode: customers.stateCode }).from(customers).where(eq(customers.userId, userId)).limit(1);
  if (!customer) return { amount: 0, label: null as string | null, taxInclusive: true };
  const rules = await db.select().from(locationSurcharges).where(and(eq(locationSurcharges.productId, productId), eq(locationSurcharges.isActive, true), ruleId ? or(eq(locationSurcharges.pricingRuleId, ruleId), isNull(locationSurcharges.pricingRuleId)) : isNull(locationSurcharges.pricingRuleId))).orderBy(asc(locationSurcharges.sortOrder));
  const city = customer.city ? normalizedCity(customer.city) : null;
  const stateCode = customer.stateCode?.toUpperCase() ?? null;
  const matched = rules.find((rule) => {
    if (rule.locationScope === "CITY") return Boolean(city && rule.city && city === normalizedCity(rule.city));
    if (rule.locationScope === "OUTSIDE_CITY") return Boolean(city && rule.city && city !== normalizedCity(rule.city));
    if (rule.locationScope === "STATE") return Boolean(stateCode && rule.stateCode && stateCode === rule.stateCode.toUpperCase());
    if (rule.locationScope === "OUTSIDE_STATE") return Boolean(stateCode && rule.stateCode && stateCode !== rule.stateCode.toUpperCase());
    return false;
  });
  return matched ? { amount: Number(matched.amount), label: matched.locationScope === "OUTSIDE_CITY" ? `Outside ${matched.city} charge` : "Location charge", taxInclusive: matched.taxInclusive } : { amount: 0, label: null, taxInclusive: true };
}

export async function calculateProductPrice(productId: string, quantity: number, options: Record<string, unknown>, input: PriceCalculationInput = {}): Promise<CalculatedPrice | null> {
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.isActive, true))).limit(1);
  if (!product || product.status !== "ACTIVE") return null;
  const base = await calculateBasePrice(productId, quantity, options);
  const surcharge = await locationCharge(productId, base.ruleId, input.userId);
  const addonIds = [...new Set(input.addonIds ?? [])];
  if (addonIds.length !== (input.addonIds ?? []).length) throw new PricingValidationError("An add-on can only be selected once");
  const configuredAddons = addonIds.length ? await db.select({ addonId: productAddons.addonId, pricingRuleId: productAddons.pricingRuleId, name: addons.name, price: productAddons.price, pricingType: addons.pricingType, taxInclusive: productAddons.taxInclusive }).from(productAddons).innerJoin(addons, eq(productAddons.addonId, addons.id)).where(and(eq(productAddons.productId, productId), eq(productAddons.isActive, true), eq(addons.isActive, true), inArray(productAddons.addonId, addonIds), base.ruleId ? or(eq(productAddons.pricingRuleId, base.ruleId), isNull(productAddons.pricingRuleId)) : isNull(productAddons.pricingRuleId))) : [];
  const selectedMappings = new Map<string, typeof configuredAddons[number]>();
  for (const addon of configuredAddons) if (!selectedMappings.has(addon.addonId) || addon.pricingRuleId === base.ruleId) selectedMappings.set(addon.addonId, addon);
  if (selectedMappings.size !== addonIds.length) throw new PricingValidationError("One or more selected add-ons are not available for this configuration");
  const selectedAddons = [...selectedMappings.values()].map((addon) => ({ addonId: addon.addonId, name: addon.name, pricingType: addon.pricingType, price: money(Number(addon.price) * (addon.pricingType === "PER_UNIT" ? quantity : 1)), taxInclusive: addon.taxInclusive }));
  const addonTotal = selectedAddons.reduce((total, addon) => total + Number(addon.price), 0);
  let delivery = { method: null as string | null, stateCode: null as string | null, price: "0.00", taxInclusive: true };
  if (input.delivery) {
    const stateCode = input.delivery.stateCode?.trim().toUpperCase() || "*";
    const rules = await db.select().from(productDeliveryRules).where(and(eq(productDeliveryRules.productId, productId), eq(productDeliveryRules.deliveryMethod, input.delivery.method), eq(productDeliveryRules.isActive, true))).orderBy(asc(productDeliveryRules.sortOrder));
    const rule = rules.find((candidate) => candidate.stateCode.toUpperCase() === stateCode) ?? rules.find((candidate) => candidate.stateCode === "*");
    if (!rule) throw new PricingValidationError("This delivery option is not available for the selected state");
    delivery = { method: rule.deliveryMethod, stateCode, price: money(Number(rule.price)), taxInclusive: rule.taxInclusive };
  }
  const total = base.amount === null ? null : base.amount + addonTotal + Number(delivery.price) + surcharge.amount;
  const taxRate = base.taxRate;
  const taxAmount = total !== null && taxRate !== null ? total - total / (1 + taxRate / 100) : 0;
  const priceBeforeTax = total !== null ? total - taxAmount : null;
  return { calculatedAmount: total === null ? null : money(total), productPrice: base.amount === null ? null : money(base.amount), addonTotal: money(addonTotal), addons: selectedAddons.map((addon) => ({ addonId: addon.addonId, name: addon.name, price: addon.price, pricingType: addon.pricingType })), delivery: { method: delivery.method, stateCode: delivery.stateCode, price: delivery.price }, locationSurcharge: { amount: money(surcharge.amount), label: surcharge.label }, taxInclusive: product.pricesTaxInclusive && base.taxInclusive && selectedAddons.every((addon) => addon.taxInclusive) && delivery.taxInclusive && surcharge.taxInclusive, taxAmount: money(taxAmount), priceBeforeTax: priceBeforeTax === null ? null : money(priceBeforeTax), taxRate: taxRate === null ? null : taxRate.toFixed(3), currency: "INR", pricingDetails: { ...base.details, referenceQuantity: product.referenceQuantity, referenceWeight: product.referenceWeight, referenceWeightUnit: product.referenceWeightUnit }, applicableRule: base.rule, applicableRuleId: base.ruleId, warnings: base.warnings };
}
