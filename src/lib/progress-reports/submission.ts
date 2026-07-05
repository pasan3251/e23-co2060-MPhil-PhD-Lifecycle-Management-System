import { DocumentType, RegistrationStatus } from "@prisma/client";

import { notifyInBackground } from "@/lib/notifications";
import { prisma } from "@/lib/prisma/client";
import {
  assertFileUploadConstraints,
  buildProgressReportStoragePath,
  generateUploadSignedUrl,
  normalizeStoragePath,
  StorageAccessError,
  STORAGE_URL_EXPIRATION_MS,
} from "@/lib/storage";
import {
  progressReportSubmissionSchema,
  type ProgressReportDocumentInput,
  type ProgressReportSubmissionInput,
} from "@/lib/progress-reports/schemas";
import type { AuthenticatedUserContext } from "@/types/auth";

export class ProgressReportSubmissionError extends Error {
  status: 400 | 403 | 404 | 409 | 413 | 500;

  constructor(message: string, status: 400 | 403 | 404 | 409 | 413 | 500 = 400) {
    super(message);
    this.name = "ProgressReportSubmissionError";
    this.status = status;
  }
}

type StudentProgressReportContext = {
  id: string;
  user: {
    id: string;
    displayName: string;
  };
  registrations: Array<{
    id: string;
  }>;
  supervisorAssignments: Array<{
    supervisor: {
      user: {
        id: string;
        displayName: string;
        email: string;
        isActive: boolean;
      };
    };
  }>;
};

function assertProgressReportPdfUpload(input: {
  contentType: string;
  fileSizeBytes: number;
  path: string;
}) {
  if (input.contentType !== "application/pdf") {
    throw new ProgressReportSubmissionError("Only PDF documents are allowed.", 400);
  }

  try {
    assertFileUploadConstraints(input);
  } catch (error) {
    if (error instanceof StorageAccessError) {
      throw new ProgressReportSubmissionError(error.message, error.status);
    }

    throw error;
  }

  const normalizedPath = normalizeStoragePath(input.path);

  if (!normalizedPath.startsWith("progress-reports/")) {
    throw new ProgressReportSubmissionError(
      "Progress report documents must be uploaded to the progress-reports directory.",
      400,
    );
  }
}

async function requireStudentProgressReportContext(
  auth: AuthenticatedUserContext,
): Promise<StudentProgressReportContext> {
  if (auth.role !== "STUDENT") {
    throw new ProgressReportSubmissionError(
      "Only students can submit progress reports.",
      403,
    );
  }

  const student = await prisma.student.findUnique({
    where: {
      userId: auth.userId,
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          displayName: true,
        },
      },
      registrations: {
        where: {
          status: RegistrationStatus.ACTIVE,
          expirationDate: {
            gte: new Date(),
          },
        },
        select: {
          id: true,
        },
        take: 1,
      },
      supervisorAssignments: {
        where: {
          isPrimary: true,
        },
        take: 1,
        select: {
          supervisor: {
            select: {
              user: {
                select: {
                  id: true,
                  displayName: true,
                  email: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new ProgressReportSubmissionError("Student profile not found.", 404);
  }

  if (student.registrations.length === 0) {
    throw new ProgressReportSubmissionError(
      "Your registration is lapsed. Renew it before submitting progress reports.",
      403,
    );
  }

  return student;
}

function buildDocumentCreateInput(input: {
  studentId: string;
  progressReportId: string;
  document: ProgressReportDocumentInput;
}) {
  const storagePath = buildProgressReportStoragePath(
    input.studentId,
    input.progressReportId,
    input.document.fileName,
  );

  assertProgressReportPdfUpload({
    contentType: input.document.mimeType,
    fileSizeBytes: input.document.sizeBytes,
    path: storagePath,
  });

  return {
    documentType: DocumentType.PROGRESS_REPORT,
    studentId: input.studentId,
    progressReportId: input.progressReportId,
    fileName: input.document.fileName,
    storagePath,
    mimeType: input.document.mimeType,
    version: 1,
    isCurrentVersion: true,
  };
}

function notifyPrimarySupervisor(input: {
  student: StudentProgressReportContext;
  periodLabel: string;
}) {
  const primarySupervisor = input.student.supervisorAssignments[0]?.supervisor.user;

  if (!primarySupervisor?.isActive || !primarySupervisor.email) {
    return;
  }

  notifyInBackground({
    event: "PROGRESS_REPORT_SUBMITTED",
    recipientUserId: primarySupervisor.id,
    to: primarySupervisor.email,
    supervisorName: primarySupervisor.displayName,
    studentName: input.student.user.displayName,
    studentId: input.student.id,
    periodLabel: input.periodLabel,
  });
}

export async function submitProgressReport(
  input: ProgressReportSubmissionInput,
  auth: AuthenticatedUserContext,
) {
  const parsed = progressReportSubmissionSchema.safeParse(input);

  if (!parsed.success) {
    throw new ProgressReportSubmissionError(
      parsed.error.issues[0]?.message ?? "Invalid progress report submission.",
      400,
    );
  }

  const student = await requireStudentProgressReportContext(auth);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.progressReport.create({
        data: {
          studentId: student.id,
          periodLabel: parsed.data.periodLabel,
          narrative: parsed.data.narrative,
          isOverdue: false,
        },
        select: {
          id: true,
          studentId: true,
          periodLabel: true,
          narrative: true,
          isSupervisorSignedOff: true,
          isOverdue: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!parsed.data.document) {
        return {
          report,
          document: null,
        };
      }

      const documentCreateInput = buildDocumentCreateInput({
        studentId: student.id,
        progressReportId: report.id,
        document: parsed.data.document,
      });

      const document = await tx.document.create({
        data: documentCreateInput,
        select: {
          id: true,
          fileName: true,
          storagePath: true,
          mimeType: true,
          version: true,
          isCurrentVersion: true,
          createdAt: true,
        },
      });

      return {
        report,
        document,
      };
    });

    const upload = result.document
      ? {
          signedUrl: await generateUploadSignedUrl(
            result.document.storagePath,
            result.document.mimeType,
          ),
          storagePath: result.document.storagePath,
          expiresInMinutes: STORAGE_URL_EXPIRATION_MS / (60 * 1000),
        }
      : null;

    notifyPrimarySupervisor({
      student,
      periodLabel: result.report.periodLabel,
    });

    return {
      report: {
        ...result.report,
        documents: result.document ? [result.document] : [],
      },
      upload,
    };
  } catch (error) {
    if (error instanceof ProgressReportSubmissionError) {
      throw error;
    }

    if (error instanceof StorageAccessError) {
      throw new ProgressReportSubmissionError(error.message, error.status);
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new ProgressReportSubmissionError(
        "A progress report for this period already exists.",
        409,
      );
    }

    throw new ProgressReportSubmissionError(
      error instanceof Error ? error.message : "Unable to submit progress report.",
      500,
    );
  }
}
