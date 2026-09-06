export type NotificationEvent =
  | "QUOTE_CREATED"
  | "QUOTE_SENT"
  | "QUOTE_APPROVED"
  | "QUOTE_REJECTED"
  | "QUOTE_EXPIRED"
  | "QUOTE_EXPIRING_SOON"
  | "ORDER_CREATED"
  | "PAYMENT_CONFIRMED"
  | "PAYMENT_FAILED"
  | "PAYMENT_PENDING_REMINDER"
  | "ARTWORK_REQUIRED"
  | "ARTWORK_REJECTED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_READY"
  | "ORDER_DISPATCHED";

export type NotificationContext = {
  customerName?: string;
  orderNumber?: string;
  quoteNumber?: string;
  product?: string;
  amount?: string;
  status?: string;
  nextAction?: string;
};
