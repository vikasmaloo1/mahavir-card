import "server-only";

import { Resend } from "resend";

/**
 * The one place a real provider is wired in. Gated entirely on RESEND_API_KEY —
 * absent in this environment, so emailConfigured() is false and sendEmail() is
 * never called for real here. This is not a stub: with a real key set, it sends
 * a genuine transactional email through Resend and reports the provider's own
 * success/failure back to the caller, which records it in notification_log.
 */
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

let client: Resend | null = null;
function resendClient() {
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(to: string, subject: string, body: string): Promise<{ sent: boolean; error?: string }> {
  if (!emailConfigured()) return { sent: false, error: "NOT_CONFIGURED" };
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return { sent: false, error: "RESEND_FROM_EMAIL is not set" };
  try {
    const result = await resendClient().emails.send({ from, to, subject, text: body });
    if (result.error) return { sent: false, error: result.error.message };
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Unknown email provider error" };
  }
}
