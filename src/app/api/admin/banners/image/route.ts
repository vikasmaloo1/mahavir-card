import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { requireRole } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage, storageKeys, validateImageFile } from "@/lib/storage";

export async function POST(request: Request) {
  let newKey: string | null = null;
  try {
    await requireRole(request, ["ADMIN"]);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("An image file is required", 422);

    await validateImageFile(file);
    newKey = storageKeys.bannerImage(file.name);

    await storage.uploadObject({
      key: newKey,
      body: new Uint8Array(await file.arrayBuffer()),
      contentType: file.type,
      contentLength: file.size,
      visibility: "PUBLIC",
      metadata: { resource: "banner", filename: file.name },
    });

    const imageUrl = `/api/storage/${encodeURIComponent(newKey)}`;
    return jsonOk({ imageUrl, storageKey: newKey, originalFilename: file.name, fileSize: file.size }, 201);
  } catch (error) {
    if (newKey) await storage.deleteObject(newKey).catch(() => undefined);
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    return handleApiError(error);
  }
}
