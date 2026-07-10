import { z } from "zod";

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_STORAGE_FILE_SIZE_BYTES,
} from "@/lib/validation/uploads";
import { sanitizedString } from "@/lib/validation/schemas";

export const progressReportDocumentSchema = z.object({
  fileName: sanitizedString.min(1, "Document file name is required."),
  storagePath: sanitizedString.min(1, "A storage path is required.").optional(),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_STORAGE_FILE_SIZE_BYTES),
});

export const progressReportSubmissionSchema = z
  .object({
    periodLabel: sanitizedString.min(1, "Period label is required."),
    narrative: sanitizedString.min(1, "Narrative is required."),
    document: progressReportDocumentSchema.optional(),
    documents: z.array(progressReportDocumentSchema).max(10).optional(),
  })
  .transform((value) => ({
    ...value,
    documents: value.documents?.length
      ? value.documents
      : value.document
        ? [value.document]
        : [],
  }));

export type ProgressReportSubmissionInput = z.infer<
  typeof progressReportSubmissionSchema
>;
export type ProgressReportDocumentInput = z.infer<
  typeof progressReportDocumentSchema
>;
