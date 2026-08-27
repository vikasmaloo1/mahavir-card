import { handleApiError, jsonOk } from "@/lib/api";
import { publicDocument } from "@/lib/document-storage";
import { generateQuoteDocument } from "@/lib/pdf-documents";
import { requireRole } from "@/lib/permissions";
import { StorageConfigurationError } from "@/lib/storage";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireRole(request, ["ADMIN"]);
    const { id } = await ctx.params;
    return jsonOk(publicDocument(await generateQuoteDocument(id, session.user.id)), 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) return Response.json({ success: false, error: { code: "STORAGE_UNAVAILABLE", message: error.message } }, { status: 503 });
    return handleApiError(error);
  }
}
