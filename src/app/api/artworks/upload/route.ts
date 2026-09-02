import { eq } from "drizzle-orm";

import { finalizeArtworkUpload, initiateArtworkUpload } from "@/lib/artwork-storage";
import { handleApiError, jsonError, jsonOk } from "@/lib/api";
import { db } from "@/lib/db/server";
import { artworks } from "@/lib/db/schema";
import { requireUser } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError, storage } from "@/lib/storage";

function formString(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("A CDR file is required", 422);
    const productId = formString(form, "productId");
    const pricingRuleId = formString(form, "pricingRuleId") || null;
    const replaceArtworkId = formString(form, "replaceArtworkId") || null;
    const artworkSlotId = formString(form, "artworkSlotId") || null;
    const artworkSlotKey = formString(form, "artworkSlotKey") || "MAIN";
    let configuration: Record<string, unknown> = {};
    const rawConfiguration = formString(form, "configuration");
    if (rawConfiguration) { try { configuration = JSON.parse(rawConfiguration) as Record<string, unknown>; } catch { return jsonError("Artwork configuration is invalid", 422); } }
    const initiated = await initiateArtworkUpload(session.user.id, { productId, pricingRuleId, artworkSlotId, artworkSlotKey, replaceArtworkId, filename: file.name, contentType: file.type, fileSize: file.size, configuration });
    const [row] = await db.select({ storageKey: artworks.storageKey }).from(artworks).where(eq(artworks.id, initiated.artwork.id)).limit(1);
    if (!row?.storageKey) return jsonError("Artwork upload could not be started", 500);
    await storage.uploadObject({ key: row.storageKey, body: new Uint8Array(await file.arrayBuffer()), contentType: initiated.headers["Content-Type"], contentLength: file.size, visibility: "PRIVATE" });
    return jsonOk(await finalizeArtworkUpload(session.user.id, initiated.artwork.id), 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    if (error instanceof Error && !error.message.toLowerCase().includes("failed query")) return jsonError(error.message, 422);
    return handleApiError(error);
  }
}
