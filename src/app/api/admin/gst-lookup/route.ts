import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { lookupGstin } from "@/lib/gst-service";
import { requireRole } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const { searchParams } = new URL(request.url);
    const gstin = searchParams.get("gstin")?.trim() || "";

    if (!gstin) {
      return jsonError("GSTIN parameter is required", 400);
    }

    const result = await lookupGstin(gstin);

    // If GST format/checksum or lookup failed completely, we still return result with valid: false
    // or return 200 with result so frontend can display user-friendly alert message
    return jsonOk(result);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);
    const body = await request.json().catch(() => ({}));
    const gstin = (body.gstin || "").trim();

    if (!gstin) {
      return jsonError("GSTIN is required in request body", 400);
    }

    const result = await lookupGstin(gstin);
    return jsonOk(result);
  } catch (error) {
    return error instanceof Response ? error : handleApiError(error);
  }
}
