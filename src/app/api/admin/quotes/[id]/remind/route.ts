import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireRole } from "@/lib/permissions";
import { sendManualQuoteReminder } from "@/lib/quote-followup";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]/remind">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const result = await sendManualQuoteReminder(id);
    if (!result.ok) {
      if (result.reason === "NOT_FOUND") return jsonError("Quote not found", 404);
      return jsonError("Only a quote awaiting customer response can be reminded", 409);
    }
    return jsonOk({ reminded: true });
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
