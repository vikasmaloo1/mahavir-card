import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { calculateProductPrice, PricingValidationError } from "@/lib/pricing-service";
import { pricingCalculateSchema } from "@/lib/validation";
import { requireUser } from "@/lib/permissions";

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, pricingCalculateSchema);
    const price = await calculateProductPrice(input.productId, input.quantity, input.options, { addonIds: input.addonIds, delivery: input.delivery, userId: session.user.id });
    return price ? jsonOk(price) : jsonError("Product not found", 404);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof PricingValidationError) return jsonError(error.message, 422);
    return handleApiError(error);
  }
}
