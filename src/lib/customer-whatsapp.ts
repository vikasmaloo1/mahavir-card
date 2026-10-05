import { normalizePhoneNumber } from "@/lib/phone";

export const LEAD_STATUSES = [
  "NEW LEAD",
  "CONTACTED",
  "TALKED ON CALL",
  "FOLLOW UP",
  "QUOTED",
  "CONVERTED",
  "LOST",
  "INACTIVE",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const CONTACT_METHODS = ["WHATSAPP", "CALL", "OTHER"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

export function isValidLeadStatus(status: unknown): status is LeadStatus {
  return typeof status === "string" && LEAD_STATUSES.includes(status as LeadStatus);
}

export function isValidContactMethod(method: unknown): method is ContactMethod {
  return typeof method === "string" && CONTACT_METHODS.includes(method as ContactMethod);
}

/**
 * Returns the official catalogue mode based on customer type:
 * B2B -> B2B trade catalogue
 * B2C -> RETAIL catalogue
 */
export function getCustomerCatalogueMode(customerType: string | null | undefined): "B2B" | "RETAIL" {
  return customerType?.toUpperCase() === "B2B" ? "B2B" : "RETAIL";
}

/**
 * Returns the download/view URL for the customer's specific catalogue PDF.
 */
export function getCustomerCatalogueUrl(customerType: string | null | undefined): string {
  const mode = getCustomerCatalogueMode(customerType);
  return `/api/catalog/pdf?mode=${mode}`;
}

/**
 * Creates the standardized, professional message for WhatsApp outreach:
 *
 * "Hi {name}, this is Mahavir Card, Ahmedabad.
 * Sharing our {B2B/B2C} printing price catalogue for your reference.
 * For higher quantities, we can discuss the rates accordingly.
 * Please feel free to share your requirement."
 */
export function buildWhatsAppMessage(customer?: {
  contactName?: string | null;
  companyName?: string | null;
  customerType?: string | null;
} | null): string {
  const rawName = customer?.contactName?.trim() || customer?.companyName?.trim() || "Customer";
  const name = rawName;
  const isB2B = customer?.customerType?.toUpperCase() === "B2B";
  const typeLabel = isB2B ? "B2B" : "B2C";

  return `Hi ${name}, this is Mahavir Card, Ahmedabad.
Sharing our ${typeLabel} printing price catalogue for your reference.
For higher quantities, we can discuss the rates accordingly.
Please feel free to share your requirement.`;
}

/**
 * Normalizes phone number into international digits without leading '+' or symbols
 * suitable for WhatsApp wa.me links (e.g. 919876543210).
 */
export function formatWhatsAppPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePhoneNumber(phone);
  const digits = normalized.replace(/\D/g, "");
  if (!digits || digits.length < 10) return null;
  // If 10 digits, assume Indian (+91)
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Builds the full WhatsApp click-to-chat URL with safely encoded prefilled text.
 * Never includes customer IDs or private tokens in the query string.
 */
export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const waPhone = formatWhatsAppPhone(phone);
  if (!waPhone) return null;
  return `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
}
