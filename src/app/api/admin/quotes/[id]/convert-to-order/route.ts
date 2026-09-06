import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireRole } from "@/lib/permissions";
import { convertQuoteToOrder } from "@/lib/quote-conversion";

export async function POST(request: Request, ctx: RouteContext<"/api/admin/quotes/[id]/convert-to-order">) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    const result = await convertQuoteToOrder(id);
    if (result.ok) return jsonOk(result.order, result.created ? 201 : 200);
    if (result.reason === "NOT_FOUND") return jsonError("Quote not found", 404);
    if (result.reason === "NOT_APPROVED") return jsonError("Only a customer-approved quote can be converted", 409);
    if (result.reason === "EMPTY") return jsonError("Add at least one quote item before conversion", 409);
    return jsonError("Order was not created", 500);
  } catch (error) { return error instanceof Response ? error : handleApiError(error); }
}
