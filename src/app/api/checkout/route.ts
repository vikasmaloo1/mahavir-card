import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { extractArtworkIds, validateRequiredArtwork } from "@/lib/artwork-validation";
import { getOwnedCart, selectionsFromConfiguration } from "@/lib/cart-service";
import { evaluateCreditEligibility } from "@/lib/customer-credit";
import { db } from "@/lib/db/server";
import { addresses, artworks, cartItems, customers, orderItems, orders, orderStatusEvents, payments, walletTransactions } from "@/lib/db/schema";
import { indiaStateName, isCommerceStateCode } from "@/lib/india-states";
import { createPaymentIntent, createRazorpayOrder, PaymentConfigurationError, PaymentProviderError, razorpayPublicKey } from "@/lib/payment-service";
import { requireUser } from "@/lib/permissions";
import { checkoutSchema } from "@/lib/validation";

function makeNumber() {
  return `MHC-O-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

class CreditCheckoutError extends Error {}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, checkoutSchema);
    if (!isCommerceStateCode(input.address.stateCode) || indiaStateName(input.address.stateCode) !== input.address.state) return jsonError("Select Gujarat or Rajasthan", 422);
    const basket = await getOwnedCart(session.user.id, "PURCHASE", input.address.stateCode);
    if (!basket.id || !basket.items.length) return jsonError("Your purchase basket is empty", 422);
    if (basket.summary.hasUnavailableItems) return jsonError("One or more basket items must be updated before checkout", 422);

    for (const item of basket.items) {
      try {
        await validateRequiredArtwork(session.user.id, item.productId, item.configuration);
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Artwork validation failed", 422);
      }
    }

    const deliverySelections = basket.items.map((item) => selectionsFromConfiguration(item.configuration).delivery).filter(Boolean);
    const deliveryMethods = [...new Set(deliverySelections.map((delivery) => delivery!.method))];
    const deliveryStates = [...new Set(deliverySelections.map((delivery) => delivery!.stateCode).filter((stateCode): stateCode is string => Boolean(stateCode && stateCode !== "*")))];
    const courierStates = [...new Set(deliverySelections.filter((delivery) => delivery!.method === "COURIER").map((delivery) => delivery!.stateCode).filter((stateCode): stateCode is string => Boolean(stateCode && stateCode !== "*")))];
    if (courierStates.length > 1) return jsonError("All courier items in one order must use the same delivery state", 422);
    if (courierStates.length === 1 && courierStates[0] !== input.address.stateCode) return jsonError("Delivery state must match the state selected for courier pricing", 422);
    const deliveryPrice = basket.items.reduce((sum, item) => sum + Number((item.pricingSnapshot as { delivery?: { price?: string } }).delivery?.price ?? 0), 0).toFixed(2);
    const total = basket.summary.total;
    const deliveryAddress = { ...input.address, line2: input.address.line2 || null, country: input.address.country || "India" };
    const orderNumber = makeNumber();
    const razorpayOrder = input.paymentMethod === "RAZORPAY" ? await createRazorpayOrder(total, orderNumber) : null;

    const result = await db.transaction(async (tx) => {
      const [existingCustomer] = await tx.select().from(customers).where(eq(customers.userId, session.user.id)).limit(1);
      const customerValues = { ...input.customer, email: session.user.email, city: input.address.city, state: input.address.state, stateCode: input.address.stateCode, updatedAt: new Date() };
      let customer = existingCustomer
        ? (await tx.update(customers).set(customerValues).where(eq(customers.id, existingCustomer.id)).returning())[0]
        : (await tx.insert(customers).values({ ...customerValues, userId: session.user.id }).returning())[0];
      if (!customer) return null;

      if (input.paymentMethod === "CREDIT") {
        const eligibility = evaluateCreditEligibility(customer, total);
        if (!eligibility.eligible) throw new CreditCheckoutError(eligibility.message);
        const [reserved] = await tx.update(customers).set({
          availableCredit: sql`${customers.availableCredit} - ${total}`,
          walletBalance: sql`${customers.availableCredit} - ${total}`,
          updatedAt: new Date(),
        }).where(and(
          eq(customers.id, customer.id),
          eq(customers.customerType, "B2B"),
          eq(customers.creditEnabled, true),
          eq(customers.status, "ACTIVE"),
          gte(customers.availableCredit, total),
        )).returning({ availableCredit: customers.availableCredit });
        if (!reserved) throw new CreditCheckoutError("Available credit changed. Refresh checkout and try again.");
        customer = { ...customer, availableCredit: reserved.availableCredit };
      }

      const [defaultAddress] = await tx.select().from(addresses).where(and(eq(addresses.customerId, customer.id), eq(addresses.type, "DELIVERY"), eq(addresses.isDefault, true))).limit(1);
      if (defaultAddress) {
        await tx.update(addresses).set({ ...deliveryAddress, updatedAt: new Date() }).where(eq(addresses.id, defaultAddress.id));
      } else {
        await tx.insert(addresses).values({ customerId: customer.id, type: "DELIVERY", ...deliveryAddress, isDefault: true });
      }

      const taxType = input.address.stateCode === "GJ" ? "INTRA_STATE" : "INTER_STATE";
      const cgstRate = input.address.stateCode === "GJ" ? "9.000" : "0.000";
      const sgstRate = input.address.stateCode === "GJ" ? "9.000" : "0.000";
      const igstRate = input.address.stateCode === "RJ" ? "18.000" : "0.000";

      const [order] = await tx.insert(orders).values({
        orderNumber,
        customerId: customer.id,
        status: input.paymentMethod === "CREDIT" ? "CONFIRMED" : "PENDING",
        subtotal: basket.summary.priceBeforeTax,
        taxableSubtotal: basket.summary.priceBeforeTax,
        tax: basket.summary.tax,
        taxType,
        taxRate: "18.000",
        cgstRate,
        cgstAmount: basket.summary.cgst,
        sgstRate,
        sgstAmount: basket.summary.sgst,
        igstRate,
        igstAmount: basket.summary.igst,
        taxJurisdictionState: input.address.stateCode,
        total,
        deliveryMethod: deliveryMethods.length === 1 ? deliveryMethods[0] : deliveryMethods.length > 1 ? "MULTIPLE" : null,
        deliveryState: deliveryStates.length === 1 ? deliveryStates[0] : null,
        deliveryPrice,
        deliveryAddress,
        notes: "Created through customer checkout",
      }).returning();
      if (!order) return null;

      await tx.insert(orderStatusEvents).values({ orderId: order.id, status: order.status, notes: "Order placed by customer", changedBy: session.user.id });

      await tx.insert(orderItems).values(basket.items.map((item) => {
        const lineTotal = Number(item.calculatedAmount ?? 0);
        const snapshot = (item.pricingSnapshot ?? {}) as Record<string, unknown>;
        const itemTaxable = snapshot.priceBeforeTax ?? snapshot.taxableSubtotal ?? snapshot.productPrice ?? "0.00";
        const itemTax = snapshot.taxAmount ?? "0.00";
        const itemCgst = snapshot.cgstAmount ?? "0.00";
        const itemSgst = snapshot.sgstAmount ?? "0.00";
        const itemIgst = snapshot.igstAmount ?? "0.00";
        return {
          orderId: order.id,
          productId: item.productId,
          description: item.product.name,
          jobName: item.jobName,
          configuration: item.configuration,
          quantity: item.quantity,
          unitPrice: (lineTotal / item.quantity).toFixed(2),
          taxableAmount: String(itemTaxable),
          taxAmount: String(itemTax),
          cgstAmount: String(itemCgst),
          sgstAmount: String(itemSgst),
          igstAmount: String(itemIgst),
          totalPrice: lineTotal.toFixed(2),
          pricingSnapshot: { ...snapshot, product: { id: item.productId, name: item.product.name, slug: item.product.slug }, quantity: item.quantity, capturedAt: new Date().toISOString() },
        };
      }));

      const orderArtworkIds = [...new Set(basket.items.flatMap((item) => extractArtworkIds(item.configuration as Record<string, unknown>)))];
      if (orderArtworkIds.length) {
        await tx.update(artworks).set({ orderId: order.id }).where(and(inArray(artworks.id, orderArtworkIds), eq(artworks.uploadedBy, session.user.id)));
      }

      const intent = createPaymentIntent(input.paymentMethod, total);
      const [payment] = await tx.insert(payments).values({ orderId: order.id, customerId: customer.id, method: input.paymentMethod, amount: total, status: intent.status, provider: intent.provider, providerOrderId: razorpayOrder?.id ?? null }).returning();
      if (input.paymentMethod === "CREDIT") {
        await tx.insert(walletTransactions).values({
          customerId: customer.id,
          transactionType: "CREDIT_ORDER",
          status: "APPROVED",
          amount: total,
          balanceAfter: customer.availableCredit,
          reference: order.orderNumber,
          notes: `Credit reserved for order ${order.orderNumber}`,
          createdBy: session.user.id,
        });
      }
      await tx.delete(cartItems).where(eq(cartItems.cartId, basket.id!));
      return payment ? { order, payment, availableCredit: input.paymentMethod === "CREDIT" ? customer.availableCredit : null, razorpay: razorpayOrder ? { orderId: razorpayOrder.id, keyId: razorpayPublicKey(), amount: razorpayOrder.amount, currency: razorpayOrder.currency } : null } : null;
    });

    return result ? jsonOk(result, 201) : jsonError("Order was not created", 500);
  } catch (error) {
    if (error instanceof CreditCheckoutError) return jsonError(error.message, 409);
    if (error instanceof PaymentConfigurationError) return jsonError(error.message, 503);
    if (error instanceof PaymentProviderError) return jsonError(error.message, 502);
    return error instanceof Response ? error : handleApiError(error);
  }
}
