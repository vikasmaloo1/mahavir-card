import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { cartItems, carts, products } from "@/lib/db/schema";
import { calculateProductPrice, type CalculatedPrice, type DeliverySelection, PricingValidationError } from "@/lib/pricing-service";

export type CartKind = "PURCHASE" | "QUOTE";

export function selectionsFromConfiguration(configuration: Record<string, unknown>) {
  const addonIds = Array.isArray(configuration.addonIds)
    ? configuration.addonIds.filter((value): value is string => typeof value === "string")
    : [];
  const value = configuration.delivery;
  const record = value && typeof value === "object" ? value as Record<string, unknown> : null;
  const delivery = record && (record.method === "PICKUP" || record.method === "LOCAL_DELIVERY" || record.method === "COURIER")
    ? { method: record.method, stateCode: typeof record.stateCode === "string" ? record.stateCode : undefined } satisfies DeliverySelection
    : undefined;
  return { addonIds, delivery };
}

export async function calculateCartSelection(productId: string, quantity: number, configuration: Record<string, unknown>, userId?: string) {
  return calculateProductPrice(productId, quantity, configuration, { ...selectionsFromConfiguration(configuration), userId });
}

export function purchasablePrice(price: CalculatedPrice | null) {
  return Boolean(price?.calculatedAmount && price.warnings.length === 0 && price.taxInclusive);
}

export async function getOwnedCart(userId: string, kind: CartKind) {
  const [cart] = await db.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.kind, kind))).limit(1);
  if (!cart) return { id: null, kind, items: [], summary: { itemCount: 0, total: "0.00", currency: "INR", taxInclusive: true, hasUnavailableItems: false } };

  const rows = await db.select({
    id: cartItems.id,
    productId: cartItems.productId,
    quantity: cartItems.quantity,
    jobName: cartItems.jobName,
    configuration: cartItems.configuration,
    storedCalculatedAmount: cartItems.calculatedAmount,
    storedPricingSnapshot: cartItems.pricingSnapshot,
    product: {
      name: products.name,
      slug: products.slug,
      orderable: products.orderable,
      quoteable: products.quoteable,
      isActive: products.isActive,
      status: products.status,
      imageUrl: products.imageUrl,
    },
  }).from(cartItems).innerJoin(products, eq(cartItems.productId, products.id)).where(eq(cartItems.cartId, cart.id)).orderBy(asc(cartItems.createdAt));

  const items = await Promise.all(rows.map(async (row) => {
    const capable = row.product.isActive && row.product.status === "ACTIVE" && (kind === "PURCHASE" ? row.product.orderable : row.product.quoteable);
    if (!capable) return { ...row, calculatedAmount: null, pricingSnapshot: row.storedPricingSnapshot, available: false, message: "This product is no longer available for this basket." };
    try {
      const price = await calculateCartSelection(row.productId, row.quantity, row.configuration, userId);
      const available = kind === "QUOTE" ? Boolean(price) : purchasablePrice(price);
      return {
        ...row,
        calculatedAmount: price?.calculatedAmount ?? null,
        pricingSnapshot: price ?? row.storedPricingSnapshot,
        available,
        message: available ? null : price?.warnings[0] ?? "A current direct-purchase price is not available.",
      };
    } catch (error) {
      const message = error instanceof PricingValidationError ? error.message : "This configuration could not be priced.";
      return { ...row, calculatedAmount: null, pricingSnapshot: row.storedPricingSnapshot, available: false, message };
    }
  }));

  const availableAmounts = items.filter((item) => item.available && item.calculatedAmount).map((item) => Number(item.calculatedAmount));
  const total = availableAmounts.reduce((sum, amount) => sum + amount, 0).toFixed(2);
  return {
    id: cart.id,
    kind,
    items,
    summary: {
      itemCount: items.length,
      total,
      currency: "INR" as const,
      taxInclusive: items.every((item) => !item.available || (item.pricingSnapshot as Partial<CalculatedPrice>).taxInclusive !== false),
      hasUnavailableItems: items.some((item) => !item.available),
    },
  };
}
