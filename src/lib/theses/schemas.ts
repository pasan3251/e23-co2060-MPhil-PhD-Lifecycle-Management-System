import { CorrectionType } from "@prisma/client";
import { z } from "zod";

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_STORAGE_FILE_SIZE_BYTES,
} from "@/lib/validation/uploads";
import { optionalSanitizedString, sanitizedString } from "@/lib/validation/schemas";

export const uploadedThesisDocumentSchema = z.object({
  fileName: sanitizedString.min(1, "Document file name is required."),
  storagePath: sanitizedString.min(1, "A storage path is required.").optional(),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_STORAGE_FILE_SIZE_BYTES),
});

export const uploadedPdfDocumentSchema = uploadedThesisDocumentSchema;

export const thesisSubmissionSchema = z
  .object({
    title: sanitizedString.min(1, "Thesis title is required."),
    abstract: sanitizedString.min(1, "Thesis abstract is required."),
    document: uploadedThesisDocumentSchema.optional(),
    documents: z
      .array(uploadedThesisDocumentSchema)
      .max(1, "Upload one thesis document per submission.")
      .optional(),
  })
  .refine(
    (value) =>
      (value.document ? 1 : 0) + (value.documents?.length ?? 0) === 1,
    "Upload exactly one thesis document.",
  )
  .transform((value) => ({
    ...value,
    documents: value.documents?.length
      ? value.documents
      : value.document
        ? [value.document]
        : [],
  }));

export const correctionSubmissionSchema = z
  .object({
    correctionType: z.nativeEnum(CorrectionType),
    description: optionalSanitizedString,
    document: uploadedThesisDocumentSchema.optional(),
    documents: z.array(uploadedThesisDocumentSchema).max(10).optional(),
  })
  .refine(
    (value) => Boolean(value.document) || Boolean(value.documents?.length),
    "Upload at least one correction document.",
  )
  .transform((value) => ({
    ...value,
    documents: value.documents?.length
      ? value.documents
      : value.document
        ? [value.document]
        : [],
  }));

export type ThesisSubmissionInput = z.infer<typeof thesisSubmissionSchema>;
export type CorrectionSubmissionInput = z.infer<typeof correctionSubmissionSchema>;
