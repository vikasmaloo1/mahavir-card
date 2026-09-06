import type { NotificationContext, NotificationEvent } from "./events";

const SUPPORT_LINE = "Questions? Call +91 94263 71150 or reply to this message. — Mahavir Card, Ahmedabad";

export type RenderedNotification = { subject: string; body: string };

/**
 * One function per event, each returning a subject + body built from real context —
 * no one-off strings scattered in route handlers. Every body ends with the same
 * support line so a customer always has a way to follow up.
 */
export function renderNotification(event: NotificationEvent, context: NotificationContext): RenderedNotification {
  const name = context.customerName || "there";
  switch (event) {
    case "QUOTE_CREATED":
      return { subject: `We received your quote request`, body: `Hi ${name}, we've received your quote request${context.product ? ` for ${context.product}` : ""}. Our team will review it and send you pricing shortly.\n\n${SUPPORT_LINE}` };
    case "QUOTE_SENT":
      return { subject: `Your quote ${context.quoteNumber ?? ""} is ready`, body: `Hi ${name}, your quotation${context.quoteNumber ? ` ${context.quoteNumber}` : ""} is ready${context.amount ? ` — total ${context.amount}` : ""}. Please review and approve it to proceed.\n\nNext step: ${context.nextAction ?? "Review and approve your quote in your account."}\n\n${SUPPORT_LINE}` };
    case "QUOTE_APPROVED":
      return { subject: `Quote ${context.quoteNumber ?? ""} approved`, body: `Hi ${name}, thanks for approving quote ${context.quoteNumber ?? ""}. ${context.nextAction ?? "Your order has been created."}\n\n${SUPPORT_LINE}` };
    case "QUOTE_REJECTED":
      return { subject: `Changes requested on quote ${context.quoteNumber ?? ""}`, body: `Hi ${name}, we've noted your requested changes on quote ${context.quoteNumber ?? ""}. Our team will follow up with a revised quotation.\n\n${SUPPORT_LINE}` };
    case "QUOTE_EXPIRED":
      return { subject: `Quote ${context.quoteNumber ?? ""} has expired`, body: `Hi ${name}, quote ${context.quoteNumber ?? ""} has passed its validity period. Request a fresh quote for the same or updated specifications.\n\n${SUPPORT_LINE}` };
    case "QUOTE_EXPIRING_SOON":
      return { subject: `Quote ${context.quoteNumber ?? ""} expires soon`, body: `Hi ${name}, your quotation ${context.quoteNumber ?? ""}${context.amount ? ` (${context.amount})` : ""} is due to expire soon. Review and approve it before it lapses.\n\nNext step: ${context.nextAction ?? "View your quotation and approve it."}\n\n${SUPPORT_LINE}` };
    case "ORDER_CREATED":
      return { subject: `Order ${context.orderNumber ?? ""} confirmed`, body: `Hi ${name}, your order ${context.orderNumber ?? ""}${context.amount ? ` for ${context.amount}` : ""} has been created. ${context.nextAction ?? "We'll update you as it moves through production."}\n\n${SUPPORT_LINE}` };
    case "PAYMENT_CONFIRMED":
      return { subject: `Payment received for ${context.orderNumber ?? "your order"}`, body: `Hi ${name}, we've received your payment${context.amount ? ` of ${context.amount}` : ""} for order ${context.orderNumber ?? ""}. Your order is confirmed.\n\n${SUPPORT_LINE}` };
    case "PAYMENT_FAILED":
      return { subject: `Payment could not be completed`, body: `Hi ${name}, your payment${context.orderNumber ? ` for order ${context.orderNumber}` : ""} could not be completed. Please retry from your account, or contact us if this keeps happening.\n\n${SUPPORT_LINE}` };
    case "PAYMENT_PENDING_REMINDER":
      return { subject: `Payment pending for ${context.orderNumber ?? "your order"}`, body: `Hi ${name}, order ${context.orderNumber ?? ""}${context.amount ? ` (${context.amount})` : ""} is still awaiting payment.\n\nNext step: ${context.nextAction ?? "Complete payment from your order page."}\n\n${SUPPORT_LINE}` };
    case "ARTWORK_REQUIRED":
      return { subject: `Artwork needed for ${context.orderNumber ?? "your order"}`, body: `Hi ${name}, order ${context.orderNumber ?? ""} is waiting on your CDR artwork before we can start production.\n\nNext step: ${context.nextAction ?? "Upload your artwork from the order page."}\n\n${SUPPORT_LINE}` };
    case "ARTWORK_REJECTED":
      return { subject: `Artwork needs changes — ${context.orderNumber ?? ""}`, body: `Hi ${name}, the artwork you uploaded for order ${context.orderNumber ?? ""} needs changes before we can proceed.${context.status ? ` Reason: ${context.status}.` : ""} Please re-upload a corrected CDR file.\n\n${SUPPORT_LINE}` };
    case "ORDER_STATUS_CHANGED":
      return { subject: `Order ${context.orderNumber ?? ""} update`, body: `Hi ${name}, order ${context.orderNumber ?? ""} is now ${context.status ?? "updated"}.\n\n${SUPPORT_LINE}` };
    case "ORDER_READY":
      return { subject: `Order ${context.orderNumber ?? ""} is ready`, body: `Hi ${name}, order ${context.orderNumber ?? ""} is ready. ${context.nextAction ?? "We'll dispatch it shortly, or it's ready for pickup."}\n\n${SUPPORT_LINE}` };
    case "ORDER_DISPATCHED":
      return { subject: `Order ${context.orderNumber ?? ""} dispatched`, body: `Hi ${name}, order ${context.orderNumber ?? ""} has been dispatched and is on its way.\n\n${SUPPORT_LINE}` };
  }
}
