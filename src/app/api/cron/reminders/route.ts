import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { runAuthMaintenance } from "@/lib/auth-maintenance";
import { isValidCronAuth } from "@/lib/cron-auth";
import { runPendingArtworkReminders, runPendingPaymentReminders } from "@/lib/order-followup";
import { runQuoteFollowups } from "@/lib/quote-followup";

/**
 * Daily reminder sweep, triggered by Vercel Cron (vercel.json) or manually via
 * curl with the same bearer secret. Every underlying function is idempotent —
 * re-running this on the same day (or by accident) sends nothing twice because
 * notification_log's unique index blocks the repeat insert. No CRON_SECRET set
 * means this endpoint refuses every request, including an unauthenticated one
 * from Vercel itself — configure the secret before relying on the schedule.
 */
export async function GET(request: Request) {
  try {
    if (!isValidCronAuth(request.headers.get("authorization"), process.env.CRON_SECRET)) return jsonError("Unauthorized", 401);

    const [quoteResult, artworkResult, paymentResult, authResult] = await Promise.all([
      runQuoteFollowups(),
      runPendingArtworkReminders(),
      runPendingPaymentReminders(),
      runAuthMaintenance(),
    ]);

    return jsonOk({ quotes: quoteResult, artwork: artworkResult, payments: paymentResult, auth: authResult });
  } catch (error) {
    return handleApiError(error);
  }
}
