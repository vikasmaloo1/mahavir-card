import fs from "node:fs/promises";
import path from "node:path";
import { handleApiError, jsonError } from "@/lib/api";
import { requireRole } from "@/lib/permissions";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".cdr": "application/octet-stream",
};

export async function GET(request: Request) {
  try {
    await requireRole(request, ["ADMIN"]);

    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    if (!targetUrl) return jsonError("url parameter is required", 400);

    const rawFilename = searchParams.get("filename") || targetUrl.split("/").pop()?.split("?")[0] || "download";
    const safeFilename = rawFilename.replace(/[/\\?%*:|"<>]/g, "_");

    // 1. If target is a relative path pointing to public directory
    if (targetUrl.startsWith("/") && !targetUrl.startsWith("//")) {
      const cleanPath = targetUrl.replace(/^\/+/, "");
      const localFilePath = path.join(process.cwd(), "public", cleanPath);
      try {
        const fileBuffer = await fs.readFile(localFilePath);
        const ext = path.extname(localFilePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || "application/octet-stream";
        return new Response(fileBuffer, {
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": `attachment; filename="${safeFilename}"`,
            "Cache-Control": "private, no-cache",
          },
        });
      } catch {
        // Fall back to HTTP fetch if not on local disk
      }
    }

    // 2. Otherwise fetch the file via HTTP
    const resolvedUrl = targetUrl.startsWith("/")
      ? new URL(targetUrl, request.url).toString()
      : targetUrl;

    const response = await fetch(resolvedUrl);
    if (!response.ok) return jsonError("Could not retrieve file", 404);

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "application/octet-stream";

    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return handleApiError(error);
  }
}
