export const MAX_STORAGE_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_APPLICATION_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export type AllowedDocumentMimeType = (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number];

export function isAllowedDocumentMimeType(
  value: string,
): value is AllowedDocumentMimeType {
  return ALLOWED_DOCUMENT_MIME_TYPES.includes(value as AllowedDocumentMimeType);
}
