import "server-only";

const VALID_ORDER_STATUSES = new Set([
  "PENDING",
  "CONFIRMED",
  "IN_PRODUCTION",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
]);

const transitions = {
  quote: {
    NEW: ["REVIEWING", "CANCELLED"], REVIEWING: ["QUOTE_CREATED", "CANCELLED"], QUOTE_CREATED: ["SENT_TO_CUSTOMER", "CANCELLED"], SENT_TO_CUSTOMER: ["CUSTOMER_APPROVED", "CUSTOMER_REJECTED", "EXPIRED", "CANCELLED"], CUSTOMER_APPROVED: ["CONVERTED_TO_ORDER"], CUSTOMER_REJECTED: [], EXPIRED: [], CONVERTED_TO_ORDER: [], CANCELLED: [],
  },
} as const;

export function canTransition(workflow: "order" | "quote", current: string, next: string) {
  if (workflow === "order") {
    return VALID_ORDER_STATUSES.has(next);
  }
  return current === next || (transitions[workflow][current as keyof typeof transitions[typeof workflow]] as readonly string[] | undefined)?.includes(next) === true;
}

