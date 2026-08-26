import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { calculateProductPrice } from "@/lib/pricing-service";
import { pricingCalculateSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const input = await readBody(request, pricingCalculateSchema);
    const price = await calculateProductPrice(input.productId, input.quantity, input.options);
    return price ? jsonOk(price) : jsonError("Product not found", 404);
  } catch (error) {
    return handleApiError(error);
  }
}
