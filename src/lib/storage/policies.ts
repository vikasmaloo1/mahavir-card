import "server-only";

import { filenameExtension } from "./helpers";

export class FilePolicyError extends Error {}

export const cdrMimeTypes = new Set(["", "application/octet-stream", "application/cdr", "application/vnd.corel-draw", "application/x-cdr"]);
export const pdfMimeTypes = new Set(["application/pdf"]);
export const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
export type ArtworkFileFormat = "CDR" | "PDF";

function configuredLimit(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}

export function imageMaxBytes() { return configuredLimit("R2_IMAGE_MAX_BYTES", 10 * 1024 * 1024); }
export function documentMaxBytes() { return configuredLimit("R2_DOCUMENT_MAX_BYTES", 25 * 1024 * 1024); }
export function artworkLimitBytes(value: number | null | undefined) { return value ? value * 1024 * 1024 : null; }

export function validateCdrMetadata(input: { filename: string; contentType?: string | null; size: number; maximumMb?: number | null; minimumMb?: number | null }) {
  if (filenameExtension(input.filename) !== ".cdr") throw new FilePolicyError("Only CorelDRAW (.cdr) files are accepted.");
  const contentType = (input.contentType ?? "").toLowerCase();
  if (!cdrMimeTypes.has(contentType)) throw new FilePolicyError("Only CorelDRAW (.cdr) files are accepted.");
  if (!Number.isSafeInteger(input.size) || input.size <= 0) throw new FilePolicyError("The artwork file is empty or has an invalid size.");
  const maximum = artworkLimitBytes(input.maximumMb);
  const minimum = artworkLimitBytes(input.minimumMb);
  if (maximum && input.size > maximum) throw new FilePolicyError(`File exceeds the ${input.maximumMb} MB limit.`);
  if (minimum && input.size < minimum) throw new FilePolicyError(`File is smaller than the ${input.minimumMb} MB minimum.`);
}

export function validateArtworkMetadata(input: { filename: string; contentType?: string | null; size: number; acceptedFormats: ArtworkFileFormat[]; maximumMb?: number | null; minimumMb?: number | null }) {
  const extension = filenameExtension(input.filename);
  const format: ArtworkFileFormat | null = extension === ".cdr" ? "CDR" : extension === ".pdf" ? "PDF" : null;
  const allowed = [...new Set(input.acceptedFormats)];
  if (!format || !allowed.includes(format)) throw new FilePolicyError(`Only ${formatNames(allowed)} artwork files are accepted.`);
  const contentType = (input.contentType ?? "").toLowerCase();
  if (format === "CDR" && !cdrMimeTypes.has(contentType)) throw new FilePolicyError("The selected file does not have a valid CorelDRAW type.");
  if (format === "PDF" && !pdfMimeTypes.has(contentType)) throw new FilePolicyError("The selected file does not have a valid PDF type.");
  if (!Number.isSafeInteger(input.size) || input.size <= 0) throw new FilePolicyError("The artwork file is empty or has an invalid size.");
  const maximum = artworkLimitBytes(input.maximumMb);
  const minimum = artworkLimitBytes(input.minimumMb);
  if (maximum && input.size > maximum) throw new FilePolicyError(`File exceeds the ${input.maximumMb} MB limit.`);
  if (minimum && input.size < minimum) throw new FilePolicyError(`File is smaller than the ${input.minimumMb} MB minimum.`);
  return format;
}

export function validatePdfHeader(bytes: Uint8Array) {
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new FilePolicyError("The uploaded file is not a valid PDF document.");
}

function formatNames(formats: ArtworkFileFormat[]) {
  if (formats.length === 1) return formats[0] === "CDR" ? "CorelDRAW (.cdr)" : "PDF (.pdf)";
  return formats.map((format) => format === "CDR" ? "CorelDRAW (.cdr)" : "PDF (.pdf)").join(" or ");
}

function matchesImageSignature(contentType: string, bytes: Uint8Array) {
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (contentType === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (contentType === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (contentType === "image/avif") return new TextDecoder().decode(bytes.slice(4, 12)).includes("ftypavif");
  return false;
}

export async function validateImageFile(file: File) {
  if (!imageMimeTypes.has(file.type.toLowerCase())) throw new FilePolicyError("Only JPEG, PNG, WebP, and AVIF images are accepted.");
  if (file.size <= 0 || file.size > imageMaxBytes()) throw new FilePolicyError(`Image must be smaller than ${Math.ceil(imageMaxBytes() / 1024 / 1024)} MB.`);
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!matchesImageSignature(file.type.toLowerCase(), header)) throw new FilePolicyError("The uploaded file does not match its image type.");
}

export async function validatePdfFile(file: File) {
  if (file.type.toLowerCase() !== "application/pdf" || filenameExtension(file.name) !== ".pdf") throw new FilePolicyError("Only PDF documents are accepted.");
  if (file.size <= 0 || file.size > documentMaxBytes()) throw new FilePolicyError(`PDF must be smaller than ${Math.ceil(documentMaxBytes() / 1024 / 1024)} MB.`);
  const header = new TextDecoder().decode(new Uint8Array(await file.slice(0, 5).arrayBuffer()));
  if (header !== "%PDF-") throw new FilePolicyError("The uploaded file is not a valid PDF document.");
}

export function validatePdfBytes(bytes: Uint8Array, filename: string, contentType = "application/pdf") {
  if (contentType.toLowerCase() !== "application/pdf" || filenameExtension(filename) !== ".pdf") throw new FilePolicyError("Only PDF documents are accepted.");
  if (!bytes.length || bytes.length > documentMaxBytes()) throw new FilePolicyError(`PDF must be smaller than ${Math.ceil(documentMaxBytes() / 1024 / 1024)} MB.`);
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new FilePolicyError("The document is not a valid PDF.");
}
