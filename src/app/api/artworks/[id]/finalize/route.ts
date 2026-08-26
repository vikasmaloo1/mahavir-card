import { finalizeArtworkUpload } from "@/lib/artwork-storage";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError } from "@/lib/storage";

export async function POST(request: Request, ctx: RouteContext<"/api/artworks/[id]/finalize">) {
  try {
    const session = await requireUser(request);
    const { id } = await ctx.params;
    return jsonOk(await finalizeArtworkUpload(session.user.id, id));
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    if (error instanceof Error && !error.message.toLowerCase().includes("failed query")) return jsonError(error.message, 422);
    return handleApiError(error);
  }
}
