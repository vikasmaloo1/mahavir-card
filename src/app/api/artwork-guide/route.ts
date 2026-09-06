import { handleApiError, jsonOk } from "@/lib/api";
import { getArtworkGuideSpecs } from "@/lib/artwork-guide";

export async function GET() {
  try {
    return jsonOk({ specs: await getArtworkGuideSpecs() });
  } catch (error) {
    return handleApiError(error);
  }
}
