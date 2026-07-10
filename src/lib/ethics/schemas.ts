import { z } from "zod";

import { sanitizedString } from "@/lib/validation/schemas";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_STORAGE_FILE_SIZE_BYTES,
} from "@/lib/validation/uploads";

export const ethicsApprovalUploadRequestSchema = z.object({
  approvalId: sanitizedString.min(1).optional(),
  fileName: sanitizedString.min(1, "A file name is required."),
  contentType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  fileSizeBytes: z.number().int().positive().max(MAX_STORAGE_FILE_SIZE_BYTES),
});

export const uploadedEthicsDocumentSchema = z.object({
  fileName: sanitizedString.min(1, "A file name is required."),
  storagePath: sanitizedString.min(1, "A storage path is required."),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_STORAGE_FILE_SIZE_BYTES),
});

export const ethicsApprovalSubmissionSchema = z
  .object({
    title: sanitizedString.min(1, "Ethics document title is required."),
    summary: sanitizedString.min(1, "Ethics document summary is required."),
    document: uploadedEthicsDocumentSchema.optional(),
    documents: z.array(uploadedEthicsDocumentSchema).max(10).optional(),
  })
  .refine(
    (value) => Boolean(value.document) || Boolean(value.documents?.length),
    "Upload at least one ethics document.",
  )
  .transform((value) => ({
    ...value,
    documents: value.documents?.length
      ? value.documents
      : value.document
        ? [value.document]
        : [],
  }));

export type EthicsApprovalUploadRequest = z.infer<
  typeof ethicsApprovalUploadRequestSchema
>;
export type EthicsApprovalSubmissionInput = z.infer<
  typeof ethicsApprovalSubmissionSchema
>;
