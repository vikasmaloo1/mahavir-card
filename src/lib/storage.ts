import "server-only";

import { del, put } from "@vercel/blob";

export type StoredArtwork = { key: string; url: string };
export class ArtworkStorageUnavailableError extends Error {}

function canStoreArtwork() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || (process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID));
}

function storageOptions() {
  if (!canStoreArtwork()) throw new ArtworkStorageUnavailableError("Artwork uploads are not configured. Connect Vercel Blob and set BLOB_READ_WRITE_TOKEN (or BLOB_STORE_ID with Vercel OIDC) to enable CDR uploads.");
  return { access: "private" as const, contentType: "application/octet-stream", addRandomSuffix: true, multipart: true };
}

export const artworkStorage = {
  async upload(input: { file: File; productId: string }): Promise<StoredArtwork> {
    const safeFileName = input.file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const object = await put(`artworks/${input.productId}/${safeFileName}`, input.file, storageOptions());
    return { key: object.pathname, url: object.url };
  },
  async remove(url: string | null | undefined) {
    if (!url) return;
    if (!canStoreArtwork()) throw new ArtworkStorageUnavailableError("Artwork storage is not configured.");
    await del(url);
  },
};
