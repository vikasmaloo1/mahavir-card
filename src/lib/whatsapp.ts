/**
 * Centralized WhatsApp link + contextual message builder.
 * Keeps prefilled message text in one place instead of duplicating strings per component.
 */

export const WHATSAPP_NUMBER = "919426371150";

export const WHATSAPP_MESSAGES = {
  GENERIC: "Hello, I found Mahavir Card online and would like to discuss a printing requirement.",
  ABOUT: "Hello, I found Mahavir Card online and would like to discuss a printing requirement.",
  COMMERCIAL_OFFSET: "Hello, I am looking for commercial/offset printing and would like to discuss my requirement.",
  CONTACT: "Hello, I would like to enquire about a printing requirement from Mahavir Card.",
  CUSTOM_REQUIREMENT: "Hello, I couldn't find the printing product I need on the website. I'd like to share my requirement for a quotation.",
} as const;

export type WhatsAppMessageKey = keyof typeof WHATSAPP_MESSAGES;

export function buildWhatsAppUrl(message: string, number: string = WHATSAPP_NUMBER): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function whatsAppUrlFor(key: WhatsAppMessageKey): string {
  return buildWhatsAppUrl(WHATSAPP_MESSAGES[key]);
}

export function whatsAppUrlForProduct(productName: string): string {
  return buildWhatsAppUrl(`Hello, I would like to discuss printing "${productName}" from Mahavir Card.`);
}
