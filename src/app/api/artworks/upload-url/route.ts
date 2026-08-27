import { z } from "zod";

import { initiateArtworkUpload } from "@/lib/artwork-storage";
import { handleApiError, jsonError, jsonOk, readBody } from "@/lib/api";
import { requireUser } from "@/lib/permissions";
import { FilePolicyError, StorageConfigurationError } from "@/lib/storage";

const inputSchema = z.object({
  productId: z.string().uuid(),
  pricingRuleId: z.string().uuid().nullable().optional(),
  artworkSlotId: z.string().uuid().nullable().optional(),
  artworkSlotKey: z.string().trim().min(1).max(80).nullable().optional(),
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().trim().max(120).nullable().optional(),
  fileSize: z.number().int().positive(),
  replaceArtworkId: z.string().uuid().nullable().optional(),
  configuration: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  try {
    const session = await requireUser(request);
    const input = await readBody(request, inputSchema);
    return jsonOk(await initiateArtworkUpload(session.user.id, input), 201);
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof FilePolicyError) return jsonError(error.message, 422);
    if (error instanceof StorageConfigurationError) return jsonError(error.message, 503);
    if (error instanceof Error && !error.message.toLowerCase().includes("failed query")) return jsonError(error.message, 422);
    return handleApiError(error);
  }
}
