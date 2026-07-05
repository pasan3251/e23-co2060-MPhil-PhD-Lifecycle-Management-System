import { z } from "zod";

import { MAX_STORAGE_FILE_SIZE_BYTES } from "@/lib/validation/uploads";
import { sanitizedString } from "@/lib/validation/schemas";

export const progressReportDocumentSchema = z.object({
  fileName: sanitizedString.min(1, "Document file name is required."),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(MAX_STORAGE_FILE_SIZE_BYTES),
});

export const progressReportSubmissionSchema = z.object({
  periodLabel: sanitizedString.min(1, "Period label is required."),
  narrative: sanitizedString.min(
    100,
    "Narrative must be at least 100 characters long.",
  ),
  document: progressReportDocumentSchema.optional(),
});

export type ProgressReportSubmissionInput = z.infer<
  typeof progressReportSubmissionSchema
>;
export type ProgressReportDocumentInput = z.infer<
  typeof progressReportDocumentSchema
>;
