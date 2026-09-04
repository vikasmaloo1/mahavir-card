import "server-only";

const transitions = {
  order: {
    PENDING: ["CONFIRMED", "CANCELLED"], CONFIRMED: ["ARTWORK_APPROVED", "IN_PRODUCTION", "CANCELLED"], ARTWORK_APPROVED: ["IN_PRODUCTION", "CANCELLED"], IN_PRODUCTION: ["READY", "CANCELLED"], READY: ["DISPATCHED", "CANCELLED"], DISPATCHED: ["DELIVERED"], DELIVERED: [], CANCELLED: [],
  },
  quote: {
    NEW: ["REVIEWING", "CANCELLED"], REVIEWING: ["QUOTE_CREATED", "CANCELLED"], QUOTE_CREATED: ["SENT_TO_CUSTOMER", "CANCELLED"], SENT_TO_CUSTOMER: ["CUSTOMER_APPROVED", "CUSTOMER_REJECTED", "EXPIRED", "CANCELLED"], CUSTOMER_APPROVED: ["CONVERTED_TO_ORDER"], CUSTOMER_REJECTED: [], EXPIRED: [], CONVERTED_TO_ORDER: [], CANCELLED: [],
  },
} as const;

export function canTransition(workflow: keyof typeof transitions, current: string, next: string) {
  return current === next || (transitions[workflow][current as keyof typeof transitions[typeof workflow]] as readonly string[] | undefined)?.includes(next) === true;
}
