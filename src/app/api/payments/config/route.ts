import { jsonOk } from "@/lib/api";
import { razorpayConfigured } from "@/lib/payment-service";

export async function GET() {
  return jsonOk({ razorpayEnabled: razorpayConfigured() });
}
