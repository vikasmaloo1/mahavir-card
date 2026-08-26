export type ObjectVisibility = "PUBLIC" | "PRIVATE";

export type UploadObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
  contentLength: number;
  visibility: ObjectVisibility;
  metadata?: Record<string, string>;
};

export type StoredObject = {
  key: string;
  etag: string | null;
  contentType: string;
  contentLength: number;
};

export type ObjectHead = {
  key: string;
  etag: string | null;
  contentType: string | null;
  contentLength: number;
  metadata: Record<string, string>;
  lastModified: Date | null;
};

export type SignedUploadInput = {
  key: string;
  contentType: string;
  expiresIn?: number;
};

export type SignedDownloadInput = {
  key: string;
  filename?: string;
  contentType?: string;
  disposition?: "inline" | "attachment";
  expiresIn?: number;
};

export interface ObjectStorage {
  uploadObject(input: UploadObjectInput): Promise<StoredObject>;
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<ObjectHead | null>;
  objectExists(key: string): Promise<boolean>;
  getObjectPrefix(key: string, byteCount: number): Promise<Uint8Array>;
  getSignedUploadUrl(input: SignedUploadInput): Promise<string>;
  getSignedDownloadUrl(input: SignedDownloadInput): Promise<string>;
}
