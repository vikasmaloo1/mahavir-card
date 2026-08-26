import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { calculateProductPrice, PricingValidationError } from "@/lib/pricing-service";
import { pricingCalculateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = await readBody(request, pricingCalculateSchema);
    const price = await calculateProductPrice(input.productId, input.quantity, input.options, { addonIds: input.addonIds, delivery: input.delivery });
    return price ? jsonOk(price) : jsonError("Product not found", 404);
  } catch (error) {
    if (error instanceof PricingValidationError) return jsonError(error.message, 422);
    return handleApiError(error);
  }
}
