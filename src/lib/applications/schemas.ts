import { ProgramType } from "@prisma/client";
import { z } from "zod";

export const APPLICATION_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export const applicationProgramTypes = [
  ProgramType.MPHIL,
  ProgramType.PHD,
  ProgramType.MSC,
  ProgramType.MENG,
] as const;

const uploadedApplicationDocumentSchema = z.object({
  fileName: z.string().min(1, "A file name is required."),
  storagePath: z.string().min(1, "A storage path is required."),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive().max(APPLICATION_ATTACHMENT_MAX_SIZE_BYTES),
});

export const applicationSubmissionSchema = z.object({
  applicantName: z.string().min(3, "Enter the applicant name."),
  applicantEmail: z.string().email("Enter a valid email address."),
  applicantPhone: z.string().min(7, "Enter a valid contact number."),
  programType: z.enum([
    ProgramType.MPHIL,
    ProgramType.PHD,
    ProgramType.MSC,
    ProgramType.MENG,
  ]),
  researchArea: z.string().min(3, "Enter the research area."),
  statementOfPurpose: z.string().min(30, "Provide a short statement of purpose."),
  supportingDocuments: z
    .array(uploadedApplicationDocumentSchema)
    .min(1, "Upload at least one supporting document."),
});

export const applicationUploadRequestSchema = z.object({
  draftId: z.string().min(1, "A draft id is required."),
  fileName: z.string().min(1, "A file name is required."),
  contentType: z.literal("application/pdf"),
  fileSizeBytes: z.number().int().positive().max(APPLICATION_ATTACHMENT_MAX_SIZE_BYTES),
});

export type ApplicationSubmissionInput = z.infer<typeof applicationSubmissionSchema>;
export type ApplicationUploadRequest = z.infer<typeof applicationUploadRequestSchema>;
