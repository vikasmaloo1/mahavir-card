import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { pricingRules, products, productVariants } from "@/lib/db/schema";

type RuleData = { quantity?: number; specification?: string; [key: string]: unknown };
type FormulaData = { amount?: string; unit?: "batch" | "piece"; [key: string]: unknown };

export type CalculatedPrice = {
  calculatedAmount: string | null;
  currency: "INR";
  pricingDetails: Record<string, unknown>;
  applicableRule: string | null;
  warnings: string[];
};

export async function calculateProductPrice(productId: string, quantity: number, options: Record<string, unknown>): Promise<CalculatedPrice | null> {
  const [product] = await db.select().from(products).where(and(eq(products.id, productId), eq(products.isActive, true))).limit(1);
  if (!product) return null;

  const rules = await db.select().from(pricingRules).where(and(eq(pricingRules.productId, productId), eq(pricingRules.isActive, true))).orderBy(asc(pricingRules.createdAt));
  const matching = rules.map((rule) => ({ rule, conditions: rule.conditions as RuleData, formula: rule.priceFormula as FormulaData })).filter(({ conditions }) => !conditions.specification || conditions.specification === options.specification).sort((a, b) => Math.abs((a.conditions.quantity ?? quantity) - quantity) - Math.abs((b.conditions.quantity ?? quantity) - quantity));
  const selected = matching[0];

  if (selected?.formula.amount) {
    const amount = Number(selected.formula.amount);
    const calculatedAmount = selected.formula.unit === "piece" ? amount * quantity : amount;
    const exactQuantity = selected.conditions.quantity === quantity;
    return { calculatedAmount: calculatedAmount.toFixed(2), currency: "INR", pricingDetails: { quantity, specification: selected.conditions.specification ?? null, source: "PRICE_LIST_2026.pdf", unit: selected.formula.unit ?? "batch" }, applicableRule: selected.rule.name, warnings: exactQuantity ? [] : ["This is the nearest listed quantity. Final pricing will be confirmed by the team."] };
  }

  const [variant] = await db.select().from(productVariants).where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true))).orderBy(asc(productVariants.basePrice)).limit(1);
  if (!variant || Number(variant.basePrice) <= 0) return { calculatedAmount: null, currency: "INR", pricingDetails: {}, applicableRule: null, warnings: ["This product needs a custom quote."] };
  return { calculatedAmount: (Number(variant.basePrice) * quantity).toFixed(2), currency: "INR", pricingDetails: { quantity, source: "BASE_VARIANT" }, applicableRule: variant.name, warnings: [] };
}
