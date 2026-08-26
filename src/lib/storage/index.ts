import "server-only";

import { R2ObjectStorage } from "./r2";

export { StorageConfigurationError } from "./r2";
export { filenameExtension, objectKey, sanitizeFilename, storageKeys, uniqueFilename } from "./helpers";
export { artworkLimitBytes, cdrMimeTypes, documentMaxBytes, FilePolicyError, imageMaxBytes, imageMimeTypes, pdfMimeTypes, validateArtworkMetadata, validateCdrMetadata, validateImageFile, validatePdfBytes, validatePdfFile, validatePdfHeader } from "./policies";
export type { ArtworkFileFormat } from "./policies";
export type { ObjectHead, ObjectStorage, ObjectVisibility, SignedDownloadInput, SignedUploadInput, StoredObject, UploadObjectInput } from "./types";

export const storage = new R2ObjectStorage();
