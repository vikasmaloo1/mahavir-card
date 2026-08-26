import { randomUUID } from "node:crypto";

import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

async function main() {
  const { storage, storageKeys } = await import("../src/lib/storage/index");
  const namespace = randomUUID();
  const serverKey = storageKeys.document("verification", namespace, "server-upload.txt");
  const signedKey = storageKeys.document("verification", namespace, "signed-upload.txt");
  const body = new TextEncoder().encode("Mahavir Card R2 verification");
  const created: string[] = [];

  try {
    await storage.uploadObject({ key: serverKey, body, contentType: "text/plain", contentLength: body.byteLength, visibility: "PRIVATE", metadata: { purpose: "verification" } });
    created.push(serverKey);
    const head = await storage.headObject(serverKey);
    if (!head || head.contentLength !== body.byteLength) throw new Error("Server upload HEAD verification failed");
    const downloadUrl = await storage.getSignedDownloadUrl({ key: serverKey, filename: "verification.txt", contentType: "text/plain", expiresIn: 60 });
    const download = await fetch(downloadUrl);
    if (!download.ok || await download.text() !== new TextDecoder().decode(body)) throw new Error("Signed download verification failed");

    const uploadUrl = await storage.getSignedUploadUrl({ key: signedKey, contentType: "text/plain", expiresIn: 60 });
    const origin = process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const preflight = await fetch(uploadUrl, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "content-type" } });
    const allowedOrigin = preflight.headers.get("access-control-allow-origin");
    const corsReady = preflight.ok && (allowedOrigin === origin || allowedOrigin === "*");
    const upload = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "text/plain" }, body });
    if (!upload.ok) throw new Error(`Signed upload failed with HTTP ${upload.status}`);
    created.push(signedKey);
    if (!await storage.objectExists(signedKey)) throw new Error("Signed upload object was not found");

    const expires = Number(new URL(uploadUrl).searchParams.get("X-Amz-Expires"));
    if (expires !== 60) throw new Error("Signed URL expiry was not constrained to 60 seconds");
    console.log("R2 verification passed: server upload, signed upload, HEAD, signed download, and expiry policy.");
    console.log(corsReady ? `R2 browser CORS allows ${origin}.` : `R2 browser CORS is not configured for ${origin}; apply the README policy before browser uploads.`);
  } finally {
    await Promise.all(created.map((key) => storage.deleteObject(key)));
    for (const key of created) if (await storage.objectExists(key)) throw new Error("R2 verification cleanup failed");
    if (created.length) console.log("R2 verification cleanup passed.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "R2 verification failed");
  process.exitCode = 1;
});
