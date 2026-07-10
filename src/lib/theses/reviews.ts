import { AcademicStatus, DocumentType, ThesisStatus, UserRole } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma/client";
import {
  assertFileUploadConstraints,
  normalizeStoragePath,
  StorageAccessError,
} from "@/lib/storage";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  MAX_STORAGE_FILE_SIZE_BYTES,
} from "@/lib/validation/uploads";
import { sanitizedString } from "@/lib/validation/schemas";
import type { AuthenticatedUserContext } from "@/types/auth";

const reviewAttachmentSchema = z.object({
  fileName: sanitizedString.min(1, "Attachment file name is required."),
  storagePath: sanitizedString.min(1, "Attachment storage path is required."),
  mimeType: z.enum(ALLOWED_DOCUMENT_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_STORAGE_FILE_SIZE_BYTES),
});

export const thesisExaminerReviewSubmissionSchema = z
  .object({
    reviewText: sanitizedString.min(1, "Review text is required.").max(10000),
    document: reviewAttachmentSchema.optional(),
    documents: z.array(reviewAttachmentSchema).max(10).optional(),
  })
  .transform((value) => ({
    ...value,
    documents: value.documents?.length
      ? value.documents
      : value.document
        ? [value.document]
        : [],
  }));

export const thesisAdminReviewReleaseSchema = z.object({
  adminComments: z.string().trim().max(10000).optional().nullable(),
  release: z.boolean().default(true),
});

export type ThesisExaminerReviewSubmissionInput = z.infer<
  typeof thesisExaminerReviewSubmissionSchema
>;
export type ThesisAdminReviewReleaseInput = z.infer<
  typeof thesisAdminReviewReleaseSchema
>;

export class ThesisReviewError extends Error {
  status: 400 | 403 | 404 | 409 | 413 | 500;

  constructor(
    message: string,
    status: 400 | 403 | 404 | 409 | 413 | 500 = 400,
  ) {
    super(message);
    this.name = "ThesisReviewError";
    this.status = status;
  }
}

async function requireAdministrator(auth: AuthenticatedUserContext) {
  if (auth.role !== UserRole.ADMINISTRATOR) {
    throw new ThesisReviewError("Only administrators can release thesis reviews.", 403);
  }

  const administrator = await prisma.administrator.findUnique({
    where: { userId: auth.userId },
    select: { id: true },
  });

  if (!administrator) {
    throw new ThesisReviewError("Administrator profile not found.", 404);
  }

  return administrator;
}

async function requireExaminer(auth: AuthenticatedUserContext) {
  if (auth.role !== UserRole.EXAMINER) {
    throw new ThesisReviewError("Only examiners can submit thesis reviews.", 403);
  }

  const examiner = await prisma.examiner.findUnique({
    where: { userId: auth.userId },
    select: { id: true },
  });

  if (!examiner) {
    throw new ThesisReviewError("Examiner profile not found.", 404);
  }

  return examiner;
}

function assertReviewAttachment(input: {
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const normalizedPath = normalizeStoragePath(input.storagePath);

  if (!normalizedPath.startsWith("review-attachments/")) {
    throw new ThesisReviewError(
      "Review attachments must be uploaded to the review-attachments directory.",
      400,
    );
  }

  try {
    assertFileUploadConstraints({
      contentType: input.mimeType,
      fileSizeBytes: input.sizeBytes,
      path: normalizedPath,
    });
  } catch (error) {
    if (error instanceof StorageAccessError) {
      throw new ThesisReviewError(error.message, error.status);
    }

    throw error;
  }
}

export async function submitThesisExaminerReview(
  assignmentId: string,
  input: ThesisExaminerReviewSubmissionInput,
  auth: AuthenticatedUserContext,
) {
  const parsed = thesisExaminerReviewSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ThesisReviewError(
      parsed.error.issues[0]?.message ?? "Invalid thesis review.",
      400,
    );
  }

  const examiner = await requireExaminer(auth);
  const assignment = await prisma.thesisExaminerAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      examinerId: true,
      studentId: true,
      submittedAt: true,
      thesis: {
        select: {
          status: true,
          student: {
            select: {
              academicStatus: true,
            },
          },
        },
      },
    },
  });

  if (!assignment) {
    throw new ThesisReviewError("Thesis examiner assignment not found.", 404);
  }

  if (assignment.examinerId !== examiner.id) {
    throw new ThesisReviewError("Forbidden.", 403);
  }

  if (
    assignment.thesis.student.academicStatus === AcademicStatus.GRADUATED ||
    assignment.thesis.status === ThesisStatus.FINAL_ARCHIVE ||
    assignment.thesis.status === ThesisStatus.CLOSED
  ) {
    throw new ThesisReviewError(
      "Graduated or archived thesis records are read-only for examiners.",
      403,
    );
  }

  if (assignment.submittedAt) {
    throw new ThesisReviewError("This thesis review has already been submitted.", 409);
  }

  for (const document of parsed.data.documents) {
    assertReviewAttachment({
      storagePath: document.storagePath,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
    });
  }

  return prisma.thesisExaminerAssignment.update({
    where: { id: assignment.id },
    data: {
      reviewText: parsed.data.reviewText,
      submittedAt: new Date(),
      documents: {
        create: parsed.data.documents.map((document) => ({
          documentType: DocumentType.REVIEW_ATTACHMENT,
          studentId: assignment.studentId,
          fileName: document.fileName,
          storagePath: document.storagePath,
          mimeType: document.mimeType,
          version: 1,
          isCurrentVersion: true,
        })),
      },
    },
    select: {
      id: true,
      thesisId: true,
      examinerId: true,
      reviewText: true,
      submittedAt: true,
      adminComments: true,
      releasedAt: true,
      documents: {
        where: {
          isDeleted: false,
        },
        select: {
          id: true,
          fileName: true,
          storagePath: true,
          mimeType: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function releaseThesisExaminerReview(
  assignmentId: string,
  input: ThesisAdminReviewReleaseInput,
  auth: AuthenticatedUserContext,
) {
  const parsed = thesisAdminReviewReleaseSchema.safeParse(input);

  if (!parsed.success) {
    throw new ThesisReviewError(
      parsed.error.issues[0]?.message ?? "Invalid thesis review release payload.",
      400,
    );
  }

  await requireAdministrator(auth);

  const assignment = await prisma.thesisExaminerAssignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true,
      submittedAt: true,
    },
  });

  if (!assignment) {
    throw new ThesisReviewError("Thesis examiner assignment not found.", 404);
  }

  if (!assignment.submittedAt) {
    throw new ThesisReviewError("The examiner review must be submitted before release.", 409);
  }

  return prisma.thesisExaminerAssignment.update({
    where: { id: assignment.id },
    data: {
      adminComments: parsed.data.adminComments,
      releasedAt: parsed.data.release ? new Date() : null,
    },
    select: {
      id: true,
      thesisId: true,
      examinerId: true,
      reviewText: true,
      submittedAt: true,
      adminComments: true,
      releasedAt: true,
    },
  });
}
