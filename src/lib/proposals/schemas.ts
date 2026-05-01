import { z } from "zod";

export const PROPOSAL_ATTACHMENT_MAX_SIZE_BYTES = 50 * 1024 * 1024;

export const proposalUploadRequestSchema = z.object({
  studentId: z.string().min(1, "Student ID is required."),
  fileName: z.string().min(1, "A file name is required."),
  contentType: z.literal("application/pdf", {
    errorMap: () => ({ message: "Only PDF documents are allowed." }),
  }),
  fileSizeBytes: z.number().int().positive().max(PROPOSAL_ATTACHMENT_MAX_SIZE_BYTES),
});

export const proposalSubmissionSchema = z.object({
  studentId: z.string().min(1, "Student ID is required."),
  title: z.string().min(5, "Title must be at least 5 characters."),
  abstract: z.string().min(20, "Abstract must be at least 20 characters."),
  fileName: z.string().min(1, "A file name is required."),
  storagePath: z.string().min(1, "A storage path is required."),
  mimeType: z.literal("application/pdf", {
    errorMap: () => ({ message: "Only PDF documents are allowed." }),
  }),
  sizeBytes: z.number().int().positive().max(PROPOSAL_ATTACHMENT_MAX_SIZE_BYTES),
});

export const proposalStatusTransitionSchema = z.object({
  proposalId: z.string().min(1, "Proposal ID is required."),
  nextStatus: z.enum(["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"]),
});

export type ProposalUploadRequest = z.infer<typeof proposalUploadRequestSchema>;
export type ProposalSubmissionInput = z.infer<typeof proposalSubmissionSchema>;

export const evaluationSubmissionSchema = z.object({
  score: z.number().int().min(0, "Score must be at least 0.").max(100, "Score cannot exceed 100."),
  feedback: z.string().min(50, "Feedback must be at least 50 characters."),
});

export type EvaluationSubmissionInput = z.infer<typeof evaluationSubmissionSchema>;
