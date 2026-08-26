import "server-only";

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { safeContentDispositionFilename } from "./helpers";
import type { ObjectHead, ObjectStorage, SignedDownloadInput, SignedUploadInput, UploadObjectInput } from "./types";

export class StorageConfigurationError extends Error {}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  endpoint: string;
};

let client: S3Client | undefined;

function value(name: keyof NodeJS.ProcessEnv) {
  return process.env[name]?.trim() ?? "";
}

function config(): R2Config {
  const result = {
    accountId: value("R2_ACCOUNT_ID"),
    accessKeyId: value("R2_ACCESS_KEY_ID"),
    secretAccessKey: value("R2_SECRET_ACCESS_KEY"),
    bucket: value("R2_BUCKET_NAME"),
    endpoint: value("R2_ENDPOINT"),
  };
  const missing = Object.entries(result).filter(([, item]) => !item).map(([name]) => name);
  if (missing.length) throw new StorageConfigurationError(`Cloudflare R2 is not configured. Missing: ${missing.join(", ")}.`);
  try {
    const endpoint = new URL(result.endpoint);
    if (endpoint.protocol !== "https:") throw new Error();
  } catch {
    throw new StorageConfigurationError("R2_ENDPOINT must be a valid HTTPS URL.");
  }
  return result;
}

function r2() {
  if (client) return client;
  const settings = config();
  client = new S3Client({
    region: "auto",
    endpoint: settings.endpoint,
    forcePathStyle: true,
    credentials: { accessKeyId: settings.accessKeyId, secretAccessKey: settings.secretAccessKey },
  });
  return client;
}

function expires(value: number | undefined, fallback: number) {
  return Math.min(900, Math.max(60, value ?? fallback));
}

function notFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const item = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return item.name === "NotFound" || item.name === "NoSuchKey" || item.$metadata?.httpStatusCode === 404;
}

export class R2ObjectStorage implements ObjectStorage {
  async uploadObject(input: UploadObjectInput) {
    const settings = config();
    const output = await r2().send(new PutObjectCommand({
      Bucket: settings.bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      Metadata: { ...input.metadata, visibility: input.visibility.toLowerCase() },
    }));
    return { key: input.key, etag: output.ETag ?? null, contentType: input.contentType, contentLength: input.contentLength };
  }

  async deleteObject(key: string) {
    const settings = config();
    await r2().send(new DeleteObjectCommand({ Bucket: settings.bucket, Key: key }));
  }

  async headObject(key: string): Promise<ObjectHead | null> {
    try {
      const settings = config();
      const output = await r2().send(new HeadObjectCommand({ Bucket: settings.bucket, Key: key }));
      return { key, etag: output.ETag ?? null, contentType: output.ContentType ?? null, contentLength: output.ContentLength ?? 0, metadata: output.Metadata ?? {}, lastModified: output.LastModified ?? null };
    } catch (error) {
      if (notFound(error)) return null;
      throw error;
    }
  }

  async objectExists(key: string) {
    return Boolean(await this.headObject(key));
  }

  async getSignedUploadUrl(input: SignedUploadInput) {
    const settings = config();
    return getSignedUrl(r2(), new PutObjectCommand({ Bucket: settings.bucket, Key: input.key, ContentType: input.contentType }), { expiresIn: expires(input.expiresIn, 300) });
  }

  async getSignedDownloadUrl(input: SignedDownloadInput) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const settings = config();
    const disposition = input.filename ? `${input.disposition ?? "attachment"}; filename="${safeContentDispositionFilename(input.filename)}"` : undefined;
    return getSignedUrl(r2(), new GetObjectCommand({ Bucket: settings.bucket, Key: input.key, ResponseContentType: input.contentType, ResponseContentDisposition: disposition }), { expiresIn: expires(input.expiresIn, 600) });
  }
}
