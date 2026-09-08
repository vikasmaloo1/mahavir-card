import { handleApiError, jsonError } from "@/lib/api";
import { getAdminAccess, requireUser } from "@/lib/permissions";
import { StorageConfigurationError, storage } from "@/lib/storage";

export async function GET(request: Request) {
  try {
    const session = await requireUser(request);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key || !key.startsWith("payments/")) {
      return jsonError("Invalid payment proof key", 400);
    }

    const admin = await getAdminAccess(request);
    const isOwner = key.startsWith(`payments/${session.user.id}/`);

    if (!admin && !isOwner) {
      return jsonError("You are not authorized to view this payment proof", 403);
    }

    const head = await storage.headObject(key);
    if (!head) {
      return jsonError("Payment proof image was not found", 404);
    }

    const filename = key.split("/").pop() || "payment-proof.jpg";
    const signedUrl = await storage.getSignedDownloadUrl({
      key,
      filename,
      contentType: head.contentType || "image/jpeg",
      disposition: "inline",
      expiresIn: 900,
    });

    return Response.redirect(signedUrl, 302);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
