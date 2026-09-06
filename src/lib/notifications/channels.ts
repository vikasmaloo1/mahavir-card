import "server-only";

/**
 * The one place a real provider gets wired in. No email/SMS/WhatsApp provider is
 * configured in this codebase today — this stub is intentionally a no-op so
 * emitNotification() can log what WOULD be sent without ever claiming delivery
 * that didn't happen. Dropping in Resend/SendGrid/etc. later means implementing
 * this one function; nothing else in the notification system needs to change.
 */
export function emailConfigured() {
  return Boolean(process.env.EMAIL_PROVIDER_API_KEY);
}

export async function sendEmail(to: string, subject: string, body: string): Promise<{ sent: boolean }> {
  if (!emailConfigured()) return { sent: false };
  // No provider integrated yet — reaching here would require EMAIL_PROVIDER_API_KEY
  // to be set, which it never is in this environment. Left unimplemented on purpose
  // rather than faking a successful send.
  throw new Error(`Email provider configured but not implemented (would send "${subject}" to ${to}, ${body.length} chars)`);
}
