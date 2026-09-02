/**
 * Mahavir Card — Backend-Driven State Availability Evaluator
 *
 * Evaluates whether a product is available for ordering in a customer's state
 * based on productDeliveryRules from PostgreSQL.
 *
 * If unavailable in state, generates structured quotation fallback context
 * so customers never hit a dead end.
 */

export type StateAvailabilityStatus = "AVAILABLE" | "UNAVAILABLE_IN_STATE" | "QUOTE_ONLY";

export type StateAvailabilityResult = {
  isAvailable: boolean;
  status: StateAvailabilityStatus;
  customerState: string | null;
  supportedStates: string[];
  deliveryMethods: string[];
  badgeText: string;
  message: string | null;
  quotePrompt: string | null;
  fallbackQuoteContext?: {
    productId: string;
    productName: string;
    productSlug: string;
    customerState?: string;
    reason: string;
  };
};

export type DeliveryRuleItem = {
  deliveryMethod: string;
  stateCode: string;
  isActive: boolean;
};

/**
 * Evaluates state availability for a single product given its delivery rules
 */
export function evaluateStateAvailability(
  product: {
    id: string;
    name: string;
    slug: string;
    orderable: boolean;
    quoteable: boolean;
  },
  deliveryRules: DeliveryRuleItem[],
  customerState?: string | null
): StateAvailabilityResult {
  const activeRules = deliveryRules.filter((r) => r.isActive);
  const activeMethods = Array.from(new Set(activeRules.map((r) => r.deliveryMethod)));
  const supportedStates = Array.from(new Set(activeRules.map((r) => r.stateCode.toUpperCase())));

  const state = customerState?.trim().toUpperCase() || null;

  // 1. If product is quote-only
  if (!product.orderable && product.quoteable) {
    return {
      isAvailable: true,
      status: "QUOTE_ONLY",
      customerState: state,
      supportedStates,
      deliveryMethods: activeMethods,
      badgeText: "Custom Quote",
      message: "This product requires a custom quotation before printing.",
      quotePrompt: "Request a custom quote with your exact specifications.",
      fallbackQuoteContext: {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        customerState: state || undefined,
        reason: "Quote-only product",
      },
    };
  }

  // 2. If no delivery rules configured, default to available
  if (activeRules.length === 0) {
    return {
      isAvailable: true,
      status: "AVAILABLE",
      customerState: state,
      supportedStates: ["*"],
      deliveryMethods: ["PICKUP"],
      badgeText: "Available",
      message: null,
      quotePrompt: null,
    };
  }

  // 3. Check if customer state matches any rule or wildcard
  const hasWildcard = supportedStates.includes("*");
  const hasStateRule = state ? supportedStates.includes(state) : false;

  // If state is not provided or customer is checking in general
  if (!state) {
    return {
      isAvailable: true,
      status: "AVAILABLE",
      customerState: null,
      supportedStates,
      deliveryMethods: activeMethods,
      badgeText: supportedStates.includes("GJ") && !hasWildcard ? "Gujarat Dispatch" : "Available",
      message: null,
      quotePrompt: null,
    };
  }

  // State is provided: check if serviced
  const courierServiced = activeRules.some(
    (r) => r.deliveryMethod === "COURIER" && (r.stateCode.toUpperCase() === state || r.stateCode === "*")
  );
  const localPickupServiced = state === "GJ" && activeRules.some((r) => r.deliveryMethod === "PICKUP" || r.deliveryMethod === "LOCAL_DELIVERY" || r.stateCode === "GJ" || r.stateCode === "*");

  if (courierServiced || localPickupServiced) {
    const courierRule = activeRules.find(
      (r) => r.deliveryMethod === "COURIER" && (r.stateCode.toUpperCase() === state || r.stateCode === "*")
    );
    const methodDesc = courierRule ? "Direct courier dispatch available" : "Counter pickup available";

    return {
      isAvailable: true,
      status: "AVAILABLE",
      customerState: state,
      supportedStates,
      deliveryMethods: activeMethods,
      badgeText: `Available in ${state}`,
      message: `${methodDesc} for ${state}.`,
      quotePrompt: null,
    };
  }

  // State is provided, but NOT supported by delivery rules!
  return {
    isAvailable: false,
    status: "UNAVAILABLE_IN_STATE",
    customerState: state,
    supportedStates,
    deliveryMethods: activeMethods,
    badgeText: `Not available in ${state}`,
    message: `Standard automated courier is currently not configured for ${state}.`,
    quotePrompt: `Not available in your state? We may still be able to arrange dispatch to ${state}. Send us your requirement and we'll check.`,
    fallbackQuoteContext: {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      customerState: state,
      reason: `Automated courier not configured for ${state}`,
    },
  };
}
