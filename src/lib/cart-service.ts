import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { artworks, cartItems, carts, products } from "@/lib/db/schema";
import { calculateProductPrice, type CalculatedPrice, type DeliverySelection, PricingValidationError } from "@/lib/pricing-service";
import { extractArtworkIds } from "@/lib/artwork-validation";

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

export async function calculateCartSelection(productId: string, quantity: number, configuration: Record<string, unknown>, userId?: string, stateCodeOverride?: string) {
  const selections = selectionsFromConfiguration(configuration);
  return calculateProductPrice(productId, quantity, configuration, { ...selections, userId, stateCode: stateCodeOverride ?? selections.delivery?.stateCode });
}

export function purchasablePrice(price: CalculatedPrice | null) {
  return Boolean(price?.calculatedAmount && price.warnings.length === 0);
}

export async function getOwnedCart(userId: string, kind: CartKind, stateCodeOverride?: string) {
  const [cart] = await db.select().from(carts).where(and(eq(carts.userId, userId), eq(carts.kind, kind))).limit(1);
  if (!cart) return { id: null, kind, items: [], summary: { itemCount: 0, productSubtotal: "0.00", addonSubtotal: "0.00", deliverySubtotal: "0.00", surchargeSubtotal: "0.00", priceBeforeTax: "0.00", tax: "0.00", cgst: "0.00", sgst: "0.00", igst: "0.00", total: "0.00", currency: "INR", taxInclusive: false, hasTaxBreakdown: false, hasUnavailableItems: false } };

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
      const price = await calculateCartSelection(row.productId, row.quantity, row.configuration, userId, stateCodeOverride);
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

  const allArtworkIds = [...new Set(items.flatMap((item) => extractArtworkIds(item.configuration as Record<string, unknown>)))];
  const artworkRows = allArtworkIds.length
    ? await db.select({ id: artworks.id, fileName: artworks.fileName, artworkSlotId: artworks.artworkSlotId }).from(artworks).where(inArray(artworks.id, allArtworkIds))
    : [];
  const artworkById = new Map(artworkRows.map((row) => [row.id, row]));
  const itemsWithArtwork = items.map((item) => {
    const configuration = item.configuration as Record<string, unknown>;
    const slotMap = configuration.artworkIds && typeof configuration.artworkIds === "object" && !Array.isArray(configuration.artworkIds)
      ? configuration.artworkIds as Record<string, unknown>
      : {};
    const legacyId = typeof configuration.artworkId === "string" ? configuration.artworkId : null;
    const entries = Object.entries(slotMap).filter(([, value]) => typeof value === "string") as Array<[string, string]>;
    if (!entries.length && legacyId) entries.push(["MAIN", legacyId]);
    const artworkFiles = entries
      .map(([slotKey, id]) => ({ slotKey, id, fileName: artworkById.get(id)?.fileName ?? null, artworkSlotId: artworkById.get(id)?.artworkSlotId ?? null }))
      .filter((entry) => entry.fileName);
    return { ...item, artworkFiles };
  });

  const availableAmounts = itemsWithArtwork.filter((item) => item.available && item.calculatedAmount).map((item) => Number(item.calculatedAmount));
  const total = availableAmounts.reduce((sum, amount) => sum + amount, 0).toFixed(2);
  const availablePrices = itemsWithArtwork.filter((item) => item.available).map((item) => item.pricingSnapshot as Partial<CalculatedPrice>);
  const sum = (read: (price: Partial<CalculatedPrice>) => number) => availablePrices.reduce((total, price) => total + read(price), 0);
  const productSubtotal = sum((price) => Number(price.productPrice ?? 0));
  const addonSubtotal = sum((price) => Number(price.addonTotal ?? 0));
  const deliverySubtotal = sum((price) => Number(price.delivery?.price ?? 0));
  const surchargeSubtotal = sum((price) => Number(price.locationSurcharge?.amount ?? 0));
  const tax = availablePrices.reduce((sum, price) => sum + Number(price.taxAmount ?? 0), 0);
  const cgst = sum((price) => Number(price.cgstAmount ?? 0));
  const sgst = sum((price) => Number(price.sgstAmount ?? 0));
  const igst = sum((price) => Number(price.igstAmount ?? 0));
  const hasTaxBreakdown = availablePrices.some((price) => price.taxRate !== null && price.taxRate !== undefined);
  return {
    id: cart.id,
    kind,
    items: itemsWithArtwork,
    summary: {
      itemCount: itemsWithArtwork.length,
      productSubtotal: productSubtotal.toFixed(2),
      addonSubtotal: addonSubtotal.toFixed(2),
      deliverySubtotal: deliverySubtotal.toFixed(2),
      surchargeSubtotal: surchargeSubtotal.toFixed(2),
      priceBeforeTax: (productSubtotal + addonSubtotal + deliverySubtotal + surchargeSubtotal).toFixed(2),
      tax: tax.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: igst.toFixed(2),
      total,
      currency: "INR" as const,
      taxInclusive: itemsWithArtwork.every((item) => !item.available || (item.pricingSnapshot as Partial<CalculatedPrice>).taxInclusive !== false),
      hasTaxBreakdown,
      hasUnavailableItems: items.some((item) => !item.available),
    },
  };
}
