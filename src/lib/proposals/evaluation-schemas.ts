import { z } from "zod";

import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_STORAGE_FILE_SIZE_BYTES,
} from "@/lib/validation/uploads";
import { sanitizedString } from "@/lib/validation/schemas";

export const proposalReviewAttachmentSchema = z.object({
  fileName: sanitizedString.min(1, "Attachment file name is required."),
  storagePath: sanitizedString.min(1, "Attachment storage path is required."),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_STORAGE_FILE_SIZE_BYTES),
});

export const proposalEvaluationSchema = z
  .object({
    feedback: sanitizedString.min(1, "Feedback is required.").max(5000),
    document: proposalReviewAttachmentSchema.optional(),
    documents: z.array(proposalReviewAttachmentSchema).max(10).optional(),
  })
  .transform((value) => ({
    ...value,
    documents: value.documents?.length
      ? value.documents
      : value.document
        ? [value.document]
        : [],
  }));

export type ProposalEvaluationInput = z.infer<typeof proposalEvaluationSchema>;
